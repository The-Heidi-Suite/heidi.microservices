import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@heidi/prisma';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { CreateTaskDto } from './dto';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly redis: RedisService,
  ) {}

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

    try {
      await this.rabbitmq.emit(RabbitMQPatterns.SCHEDULE_EXECUTE, {
        taskId: task.id,
        name: task.name,
        payload: task.payload,
        timestamp: new Date().toISOString(),
      });

      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastRunStatus: 'SUCCESS',
          runCount: { increment: 1 },
        },
      });

      await this.rabbitmq.emit(RabbitMQPatterns.SCHEDULE_COMPLETED, {
        taskId: task.id,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Task execution failed: ${task.name}`, error);

      await this.prisma.schedule.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastRunStatus: 'FAILED',
        },
      });
    }
  }
}
