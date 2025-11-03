import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaNotificationService } from '@heidi/prisma';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { SendNotificationDto } from './dto';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaNotificationService,
    private readonly rabbitmq: RabbitMQService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(NotificationService.name);
  }

  async onModuleInit() {
    // Listen to notification events
    this.logger.log('Notification service initialized - listening to events');
  }

  async send(dto: SendNotificationDto) {
    this.logger.log(`Sending notification to user: ${dto.userId}`);

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        channel: dto.channel,
        subject: dto.subject,
        content: dto.content,
        metadata: dto.metadata || {},
        status: 'PENDING',
      },
    });

    // Queue notification for delivery
    await this.rabbitmq.emit(RabbitMQPatterns.NOTIFICATION_SEND, {
      notificationId: notification.id,
      ...dto,
    });

    this.logger.log(`Notification queued: ${notification.id}`);
    return notification;
  }

  async getUserNotifications(userId: string, status?: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
