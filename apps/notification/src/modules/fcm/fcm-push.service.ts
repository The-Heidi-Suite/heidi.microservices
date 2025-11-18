import { Injectable, Inject } from '@nestjs/common';
import { FCMService } from './fcm.service';
import { FCMTranslationService } from './fcm-translation.service';
import { LoggerService } from '@heidi/logger';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { SendNotificationDto } from '@heidi/contracts';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class FCMPushService {
  private readonly logger: LoggerService;

  constructor(
    private readonly fcmService: FCMService,
    private readonly translationService: FCMTranslationService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(FCMPushService.name);
  }

  /**
   * Send push notification to user
   * Fetches user's FCM tokens and city from users service
   * Supports multi-language notifications with translation
   */
  async sendPushNotification(dto: SendNotificationDto, requestLanguage?: string): Promise<void> {
    try {
      // Fetch user data including FCM tokens, city, and preferred language
      const user = await firstValueFrom(
        this.client
          .send<any, { id: string }>(RabbitMQPatterns.USER_FIND_BY_ID, { id: dto.userId })
          .pipe(timeout(10000)),
      );

      if (!user) {
        throw new Error(`User ${dto.userId} not found`);
      }

      // Get user's FCM tokens from metadata or device info
      const fcmTokens = this.extractFCMTokens(user);

      if (!fcmTokens || fcmTokens.length === 0) {
        this.logger.warn(`No FCM tokens found for user ${dto.userId}`);
        return;
      }

      // Determine cityId - use provided, user's city, or null (default)
      const targetCityId = dto.cityId || user.cityId || null;

      // Get translated notification content
      const notification = await this.translationService.getNotificationContent(
        dto,
        user,
        requestLanguage,
      );

      // Send notification
      if (fcmTokens.length === 1) {
        await this.fcmService.sendToDevice(fcmTokens[0], notification, dto.fcmData, targetCityId);
      } else {
        await this.fcmService.sendToMultipleDevices(
          fcmTokens,
          notification,
          dto.fcmData,
          targetCityId,
        );
      }

      this.logger.log(`Push notification sent to user ${dto.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${dto.userId}`, error);
      throw error;
    }
  }

  /**
   * Extract FCM tokens from user object
   * Tokens might be stored in metadata, device info, or separate tokens table
   */
  private extractFCMTokens(user: any): string[] {
    const tokens: string[] = [];

    // Check metadata for FCM tokens
    if (user.metadata?.fcmTokens && Array.isArray(user.metadata.fcmTokens)) {
      tokens.push(...user.metadata.fcmTokens);
    }

    // Check device info (if tokens are stored per device)
    if (user.devices && Array.isArray(user.devices)) {
      for (const device of user.devices) {
        if (device.fcmToken) {
          tokens.push(device.fcmToken);
        }
      }
    }

    return tokens.filter((token) => token && token.length > 0);
  }
}
