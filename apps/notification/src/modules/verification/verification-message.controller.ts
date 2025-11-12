import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { VerificationService } from './verification.service';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';

@Controller()
export class VerificationMessageController {
  private readonly logger: LoggerService;

  constructor(
    private readonly verificationService: VerificationService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(VerificationMessageController.name);
  }

  @EventPattern(RabbitMQPatterns.USER_CREATED)
  async handleUserCreated(
    @Payload()
    data: {
      userId: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      cityId?: string | null;
      timestamp: string;
      userType?: string;
      deviceId?: string;
      devicePlatform?: string;
      preferredLanguage?: string;
    },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_CREATED} for userId: ${data.userId}`,
    );

    try {
      // Automatically send welcome email with verification link
      if (data.email) {
        await this.verificationService.sendVerification(
          {
            userId: data.userId,
            type: 'EMAIL',
            identifier: data.email,
            metadata: {
              firstName: data.firstName,
              lastName: data.lastName,
              cityId: data.cityId || null, // Pass cityId to verification service
              isWelcomeEmail: true,
              preferredLanguage: data.preferredLanguage,
            },
          },
          data.preferredLanguage,
        );

        this.logger.log(
          `Welcome email with verification sent to ${data.email} for user ${data.userId}`,
        );
      }

      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_CREATED} for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }
}
