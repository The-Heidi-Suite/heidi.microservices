import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaSchedulerService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { CreateTaskDto } from './dto';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaSchedulerService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly redis: RedisService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(TasksService.name);
  }

  async onModuleInit() {
    this.logger.log('Scheduler service initialized');
  }

  // Example cron job - runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    const lockKey = 'scheduler:hourly:lock';
    const acquired = await this.redis.acquireLock(lockKey, 300);

    if (!acquired) {
      this.logger.warn('Could not acquire lock for hourly tasks');
      return;
    }

    try {
      this.logger.log('Running hourly scheduled tasks');
      const tasks = await this.prisma.schedule.findMany({
        where: { isEnabled: true },
      });

      for (const task of tasks) {
        await this.executeTask(task);
      }
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async findAll() {
    return this.prisma.schedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({ where: { id } });
  }

  async create(dto: CreateTaskDto) {
    const task = await this.prisma.schedule.create({
      data: {
        name: dto.name,
        description: dto.description,
        cronExpression: dto.cronExpression,
        payload: dto.payload || {},
        isEnabled: true,
      },
    });

    this.logger.log(`Task created: ${task.id}`);
    return task;
  }

  /**
   * Manually trigger a schedule to run immediately
   * Does not modify the cron configuration - only executes the task once
   */
  async runById(id: string) {
    const task = await this.prisma.schedule.findUnique({ where: { id } });

    if (!task) {
      throw new Error(`Schedule with id ${id} not found`);
    }

    this.logger.log(`Manually triggering schedule: ${task.name} (${id})`);

    // Execute the task (this will create a run log and update schedule stats)
    await this.executeTask(task);

    // Fetch the latest run log for this schedule
    const latestRunLog = await this.prisma.scheduleRunLog.findFirst({
      where: { scheduleId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      schedule: task,
      runLog: latestRunLog || null,
    };
  }

  /**
   * Get run history for a schedule
   */
  async getRunHistory(scheduleId: string, limit: number = 20) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule with id ${scheduleId} not found`);
    }

    const runLogs = await this.prisma.scheduleRunLog.findMany({
      where: { scheduleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      schedule,
      runLogs,
      total: runLogs.length,
    };
  }

  private async executeTask(task: any) {
    this.logger.log(`Executing task: ${task.name}`);

    const executionStartTime = new Date();
    let runLog: any;
    let executionResult: any = null;
    let taskType: string = 'unknown';

    // Create schedule run log
    try {
      runLog = await this.prisma.scheduleRunLog.create({
        data: {
          scheduleId: task.id,
          startedAt: executionStartTime,
          status: 'SUCCESS', // Will be updated if it fails
        },
      });
      this.logger.debug(`Created schedule run log: ${runLog.id} for task: ${task.id}`);
    } catch (error) {
      this.logger.error(`Failed to create schedule run log for task: ${task.id}`, error);
      // Continue execution even if log creation fails
    }

    try {
      // Check task kind to route to appropriate handler
      if (task.payload && task.payload.kind === 'favorite-event-reminders') {
        taskType = 'favorite-event-reminders';
        this.logger.log(
          `Task ${task.name} is favorite-event-reminders, triggering reminder processing`,
        );

        // Use send() to wait for response and capture results
        try {
          executionResult = await firstValueFrom(
            this.client
              .send<{ sent24h: number; sent2h: number }>(
                RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN,
                {
                  taskId: task.id,
                  scheduleRunId: runLog?.id,
                  triggeredAt: executionStartTime.toISOString(),
                },
              )
              .pipe(timeout(300000)), // 5 minute timeout
          );
          this.logger.debug(
            `Favorite reminders completed: ${executionResult.sent24h} 24h reminders, ${executionResult.sent2h} 2h reminders`,
          );
        } catch (error) {
          this.logger.error('Failed to get response from favorite reminders handler', error);
          throw error;
        }
      } else if (task.payload && task.payload.integrationId) {
        taskType = 'integration-sync';
        this.logger.log(`Task ${task.name} contains integrationId, triggering integration sync`);

        // Use send() to wait for response and capture results
        try {
          executionResult = await firstValueFrom(
            this.client
              .send<{ created: number; updated: number; skipped: number }>(
                RabbitMQPatterns.INTEGRATION_SYNC,
                {
                  integrationId: task.payload.integrationId,
                  taskId: task.id,
                  scheduleRunId: runLog?.id,
                  timestamp: executionStartTime.toISOString(),
                },
              )
              .pipe(timeout(600000)), // 10 minute timeout for integration syncs
          );
          this.logger.debug(
            `Integration sync completed: ${executionResult.created} created, ${executionResult.updated} updated, ${executionResult.skipped} skipped`,
          );
        } catch (error) {
          this.logger.error('Failed to get response from integration sync handler', error);
          // For integration sync, we might want to continue even if response fails
          // since the sync might still be processing asynchronously
          // But we'll mark it as failed for now
          throw error;
        }
      } else {
        taskType = 'default';
        // Default task execution
        this.client.emit(RabbitMQPatterns.SCHEDULE_EXECUTE, {
          taskId: task.id,
          scheduleRunId: runLog?.id,
          name: task.name,
          payload: task.payload,
          timestamp: executionStartTime.toISOString(),
        });
        executionResult = { message: 'Task executed (fire-and-forget)' };
      }

      const executionEndTime = new Date();
      const executionDuration = executionEndTime.getTime() - executionStartTime.getTime();

      // Update schedule
      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: executionEndTime,
          lastRunStatus: 'SUCCESS',
          runCount: { increment: 1 },
        },
      });

      // Build comprehensive run summary
      const runSummary: any = {
        taskType,
        taskName: task.name,
        executionStartTime: executionStartTime.toISOString(),
        executionEndTime: executionEndTime.toISOString(),
        executionDurationMs: executionDuration,
        executionDurationSeconds: Math.round(executionDuration / 1000),
        status: 'SUCCESS',
        completed: true,
      };

      // Add task-specific results
      if (executionResult) {
        if (taskType === 'favorite-event-reminders') {
          runSummary.reminders = {
            sent24h: executionResult.sent24h || 0,
            sent2h: executionResult.sent2h || 0,
            total: (executionResult.sent24h || 0) + (executionResult.sent2h || 0),
          };
        } else if (taskType === 'integration-sync') {
          runSummary.sync = {
            created: executionResult.created || 0,
            updated: executionResult.updated || 0,
            skipped: executionResult.skipped || 0,
            total:
              (executionResult.created || 0) +
              (executionResult.updated || 0) +
              (executionResult.skipped || 0),
          };
          if (task.payload?.integrationId) {
            runSummary.integrationId = task.payload.integrationId;
          }
        } else {
          runSummary.result = executionResult;
        }
      }

      // Add task payload metadata (excluding sensitive data)
      if (task.payload) {
        const payloadCopy = { ...task.payload };
        // Remove sensitive fields if present
        delete payloadCopy.apiKey;
        delete payloadCopy.password;
        delete payloadCopy.secret;
        runSummary.payload = payloadCopy;
      }

      // Update run log with detailed success status
      if (runLog) {
        await this.prisma.scheduleRunLog.update({
          where: { id: runLog.id },
          data: {
            finishedAt: executionEndTime,
            status: 'SUCCESS',
            runSummary,
          },
        });
      }

      this.client.emit(RabbitMQPatterns.SCHEDULE_COMPLETED, {
        taskId: task.id,
        scheduleRunId: runLog?.id,
        status: 'SUCCESS',
        timestamp: executionEndTime.toISOString(),
      });
    } catch (error) {
      const executionEndTime = new Date();
      const executionDuration = executionEndTime.getTime() - executionStartTime.getTime();

      this.logger.error(`Task execution failed: ${task.name}`, error);

      // Update schedule with failure
      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: executionEndTime,
          lastRunStatus: 'FAILED',
        },
      });

      // Build comprehensive error summary
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      const runSummary: any = {
        taskType,
        taskName: task.name,
        executionStartTime: executionStartTime.toISOString(),
        executionEndTime: executionEndTime.toISOString(),
        executionDurationMs: executionDuration,
        executionDurationSeconds: Math.round(executionDuration / 1000),
        status: 'FAILED',
        error: true,
        errorName,
        errorMessage,
      };

      if (errorStack) {
        runSummary.errorStack = errorStack;
      }

      // Add partial results if available
      if (executionResult) {
        runSummary.partialResult = executionResult;
      }

      // Add task payload metadata (excluding sensitive data)
      if (task.payload) {
        const payloadCopy = { ...task.payload };
        delete payloadCopy.apiKey;
        delete payloadCopy.password;
        delete payloadCopy.secret;
        runSummary.payload = payloadCopy;
      }

      // Update run log with detailed failure status
      if (runLog) {
        await this.prisma.scheduleRunLog.update({
          where: { id: runLog.id },
          data: {
            finishedAt: executionEndTime,
            status: 'FAILED',
            errorMessage,
            runSummary,
          },
        });
      }
    }
  }
}
