import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly prisma: PrismaIntegrationService,
    private readonly rabbitmq: RabbitMQService,
    private readonly http: HttpService,
  ) {}

  async findAll() {
    return this.prisma.integration.findMany({
      where: { isActive: true },
    });
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
      await this.rabbitmq.emit(RabbitMQPatterns.INTEGRATION_WEBHOOK, {
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
