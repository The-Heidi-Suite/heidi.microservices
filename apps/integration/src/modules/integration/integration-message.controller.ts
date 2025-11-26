import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IntegrationService } from './integration.service';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';

@Controller()
export class IntegrationMessageController {
  private readonly logger: LoggerService;

  constructor(
    private readonly integrationService: IntegrationService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(IntegrationMessageController.name);
  }

  @MessagePattern(RabbitMQPatterns.INTEGRATION_SYNC)
  async handleIntegrationSync(@Payload() data: { integrationId: string; timestamp?: string }) {
    this.logger.log(
      `Received integration sync request: ${RabbitMQPatterns.INTEGRATION_SYNC} for integrationId: ${data.integrationId}`,
    );

    try {
      const result = await this.integrationService.syncIntegration(data.integrationId);
      this.logger.debug(
        `Successfully processed integration sync for integrationId: ${data.integrationId} (will ACK)`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Error processing integration sync for integrationId: ${data.integrationId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.INTEGRATION_SUBSCRIBE_NEWSLETTER)
  async handleSubscribeNewsletter(@Payload() data: { userId: string; email: string }) {
    this.logger.log(
      `Received newsletter subscription request: ${RabbitMQPatterns.INTEGRATION_SUBSCRIBE_NEWSLETTER} for userId: ${data.userId}, email: ${data.email}`,
    );

    try {
      const result = await this.integrationService.subscribeToNewsletter(data.userId, data.email);
      this.logger.debug(
        `Successfully processed newsletter subscription for userId: ${data.userId} (will ACK)`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Error processing newsletter subscription for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }
}
