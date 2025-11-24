import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaSchedulerService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { CreateTaskDto } from './dto';

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

  private async executeTask(task: any) {
    this.logger.log(`Executing task: ${task.name}`);

    // Create schedule run log
    let runLog: any;
    try {
      runLog = await this.prisma.scheduleRunLog.create({
        data: {
          scheduleId: task.id,
          startedAt: new Date(),
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
        this.logger.log(
          `Task ${task.name} is favorite-event-reminders, triggering reminder processing`,
        );
        this.client.emit(RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN, {
          taskId: task.id,
          scheduleRunId: runLog?.id,
          triggeredAt: new Date().toISOString(),
        });
      } else if (task.payload && task.payload.integrationId) {
        this.logger.log(`Task ${task.name} contains integrationId, triggering integration sync`);
        this.client.emit(RabbitMQPatterns.INTEGRATION_SYNC, {
          integrationId: task.payload.integrationId,
          taskId: task.id,
          scheduleRunId: runLog?.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Default task execution
        this.client.emit(RabbitMQPatterns.SCHEDULE_EXECUTE, {
          taskId: task.id,
          scheduleRunId: runLog?.id,
          name: task.name,
          payload: task.payload,
          timestamp: new Date().toISOString(),
        });
      }

      // Update schedule
      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastRunStatus: 'SUCCESS',
          runCount: { increment: 1 },
        },
      });

      // Update run log with success status
      if (runLog) {
        await this.prisma.scheduleRunLog.update({
          where: { id: runLog.id },
          data: {
            finishedAt: new Date(),
            status: 'SUCCESS',
            runSummary: { completed: true },
          },
        });
      }

      this.client.emit(RabbitMQPatterns.SCHEDULE_COMPLETED, {
        taskId: task.id,
        scheduleRunId: runLog?.id,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Task execution failed: ${task.name}`, error);

      // Update schedule with failure
      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastRunStatus: 'FAILED',
        },
      });

      // Update run log with failure status
      if (runLog) {
        await this.prisma.scheduleRunLog.update({
          where: { id: runLog.id },
          data: {
            finishedAt: new Date(),
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
            runSummary: { error: true },
          },
        });
      }
    }
  }
}
