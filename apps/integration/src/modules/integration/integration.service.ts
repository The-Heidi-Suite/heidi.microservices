import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { firstValueFrom } from 'rxjs';
import { DestinationOneService } from '../destination-one/destination-one.service';
import { MobilithekParkingService } from '../mobilithek-parking/mobilithek-parking.service';

@Injectable()
export class IntegrationService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaIntegrationService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly http: HttpService,
    private readonly destinationOneService: DestinationOneService,
    private readonly mobilithekParkingService: MobilithekParkingService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(IntegrationService.name);
  }

  async findAll() {
    return this.prisma.integration.findMany({
      where: { isActive: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.integration.findUnique({
      where: { id },
    });
  }

  // Generic dispatcher for syncing by provider
  async syncIntegration(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    switch (integration.provider) {
      case 'DESTINATION_ONE':
        return this.destinationOneService.syncIntegration(integrationId);
      case 'MOBILITHEK_PARKING':
        return this.mobilithekParkingService.syncIntegration(integrationId);
      default:
        throw new Error(`Unsupported integration provider: ${integration.provider}`);
    }
  }

  // Explicit method retained for direct calls/tests
  async syncDestinationOne(integrationId: string) {
    this.logger.log(`Syncing destination_one integration: ${integrationId}`);

    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (integration.provider !== 'DESTINATION_ONE') {
      throw new Error(`Integration ${integrationId} is not a DESTINATION_ONE integration`);
    }

    if (!integration.isActive) {
      throw new Error(`Integration ${integrationId} is not active`);
    }

    return this.destinationOneService.syncIntegration(integrationId);
  }

  @MessagePattern(RabbitMQPatterns.INTEGRATION_SYNC)
  async handleIntegrationSync(@Payload() data: { integrationId: string; timestamp?: string }) {
    this.logger.log(
      `Received integration sync request: ${RabbitMQPatterns.INTEGRATION_SYNC} for integrationId: ${data.integrationId}`,
    );

    try {
      const result = await this.syncIntegration(data.integrationId);
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

  async handleWebhook(provider: string, payload: any) {
    this.logger.log(`Received webhook from provider: ${provider}`);

    // Verify webhook signature (implementation depends on provider)
    // const isValid = this.verifyWebhookSignature(provider, payload);

    // Log the webhook event
    const integration = await this.prisma.integration.findFirst({
      where: { provider: provider as any, isActive: true },
    });

    if (integration) {
      await this.prisma.integrationLog.create({
        data: {
          integrationId: integration.id,
          event: 'webhook_received',
          payload,
          status: 'SUCCESS',
        },
      });

      // Forward event to other services via RabbitMQ
      this.client.emit(RabbitMQPatterns.INTEGRATION_WEBHOOK, {
        provider,
        integrationId: integration.id,
        payload,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: 'Webhook processed',
      provider,
    };
  }

  async makeHttpRequest(url: string, options: any = {}) {
    try {
      const response = await firstValueFrom(this.http.request({ url, ...options }));
      return response.data;
    } catch (error) {
      this.logger.error(`HTTP request failed: ${url}`, error);
      throw error;
    }
  }
}
