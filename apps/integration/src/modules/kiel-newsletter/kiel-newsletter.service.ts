import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { ConfigService } from '@heidi/config';
import { firstValueFrom } from 'rxjs';
import { NewsletterSubscription, NewsletterSubscriptionStatus } from '@prisma/client-integration';

interface KielNewsletterConfig {
  username?: string;
  password?: string;
  clientId: string;
  hostUrl: string;
  apiKey: string;
  attributeId: number;
  eventId: number;
  consentPurposeId: number;
}

interface CreateContactRequest {
  email: string;
  attributes: Array<{
    id: number;
    value: string;
  }>;
  consent: {
    storage: {
      purposes: Array<{
        id: number;
        date: string;
        permission: number;
      }>;
    };
  };
}

interface CreateEventRequest {
  eventId: number;
  contactId: string;
}

interface ContactResponse {
  id: string;
  email: string;
  [key: string]: any;
}

@Injectable()
export class KielNewsletterService {
  private readonly logger: LoggerService;
  private readonly defaultConfig: KielNewsletterConfig;

  constructor(
    private readonly prisma: PrismaIntegrationService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(KielNewsletterService.name);

    // Initialize default config from ConfigService
    // Priority: 1. Database Integration record, 2. ConfigService (from env vars), 3. Hardcoded defaults
    const kielNewsletterConfig = this.configService.kielNewsletterConfig;

    this.defaultConfig = {
      clientId: kielNewsletterConfig.clientId,
      hostUrl: kielNewsletterConfig.hostUrl,
      apiKey: kielNewsletterConfig.apiKey,
      attributeId: kielNewsletterConfig.attributeId,
      eventId: kielNewsletterConfig.eventId,
      consentPurposeId: kielNewsletterConfig.consentPurposeId,
    };
  }

  /**
   * Get EMS configuration from Integration record or use defaults
   */
  private async getConfig(): Promise<KielNewsletterConfig> {
    const integration = await this.prisma.integration.findFirst({
      where: { provider: 'KIEL_NEWSLETTER', isActive: true },
    });

    if (integration?.config) {
      const config = integration.config as unknown as KielNewsletterConfig;
      // Merge with defaults to ensure all required fields are present
      return {
        ...this.defaultConfig,
        ...config,
      };
    }

    return this.defaultConfig;
  }

  /**
   * Subscribe a user to the newsletter via E-Marketing Suite
   */
  async subscribeToNewsletter(userId: string, email: string): Promise<NewsletterSubscription> {
    this.logger.log(`Subscribing user ${userId} (${email}) to newsletter`);

    // Check for existing subscription
    const existingSubscription = await this.prisma.newsletterSubscription.findFirst({
      where: {
        OR: [{ userId }, { email }],
      },
    });

    if (existingSubscription) {
      this.logger.warn(`Subscription already exists for userId: ${userId} or email: ${email}`);
      throw new ConflictException('User is already subscribed to the newsletter');
    }

    try {
      const config = await this.getConfig();

      // Validate API key is set
      if (!config.apiKey || config.apiKey.trim() === '') {
        throw new Error(
          'EMS API key is not configured. Please set KIEL_NEWSLETTER_API_KEY environment variable or seed the integration.',
        );
      }

      // Step 1: Create contact in EMS
      const contactRequest: CreateContactRequest = {
        email,
        attributes: [
          {
            id: config.attributeId,
            value: 'Newsletter signup via mein.Kiel App',
          },
        ],
        consent: {
          storage: {
            purposes: [
              {
                id: config.consentPurposeId,
                date: 'AUTO',
                permission: 10, // Preliminary consent
              },
            ],
          },
        },
      };

      const contactUrl = `${config.hostUrl}contacts`;
      this.logger.debug(`Creating contact at ${contactUrl}`);

      const contactResponse = await firstValueFrom(
        this.http.post<ContactResponse>(contactUrl, contactRequest, {
          headers: {
            Authorization: config.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const contactId = contactResponse.data?.id;
      if (!contactId) {
        throw new Error('Contact created but no ID returned from EMS API');
      }

      this.logger.log(`Contact created in EMS with ID: ${contactId}`);

      // Step 2: Trigger event
      const eventRequest: CreateEventRequest = {
        eventId: config.eventId,
        contactId: contactId,
      };

      const eventUrl = `${config.hostUrl}events`;
      this.logger.debug(`Triggering event at ${eventUrl}`);

      let eventTriggered = false;
      try {
        await firstValueFrom(
          this.http.post(eventUrl, eventRequest, {
            headers: {
              Authorization: config.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }),
        );
        eventTriggered = true;
        this.logger.log(`Event triggered for contact ${contactId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to trigger event for contact ${contactId}: ${error?.message}`,
          error,
        );
        // Continue even if event trigger fails - contact is already created
      }

      // Step 3: Create subscription record in database
      const subscription = await this.prisma.newsletterSubscription.create({
        data: {
          userId,
          email,
          emsContactId: contactId,
          status: NewsletterSubscriptionStatus.PENDING,
          emsEventTriggered: eventTriggered,
        },
      });

      // Log the activity
      await this.logSubscriptionActivity(subscription.id, 'newsletter_subscription', {
        email,
        contactId,
        eventTriggered,
      });

      this.logger.log(
        `Newsletter subscription created for user ${userId} with ID: ${subscription.id}`,
      );

      return subscription;
    } catch (error: any) {
      this.logger.error(`Failed to subscribe ${email} to newsletter`, error);

      // Log the error
      try {
        await this.logSubscriptionActivity(null, 'newsletter_subscription_failed', {
          userId,
          email,
          error: error?.message || 'Unknown error',
        });
      } catch (logError) {
        this.logger.error('Failed to log subscription error', logError);
      }

      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<NewsletterSubscription | null> {
    return this.prisma.newsletterSubscription.findUnique({
      where: { userId },
    });
  }

  /**
   * Get subscription status by email
   */
  async getSubscriptionStatusByEmail(email: string): Promise<NewsletterSubscription | null> {
    return this.prisma.newsletterSubscription.findUnique({
      where: { email },
    });
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: NewsletterSubscriptionStatus,
  ): Promise<NewsletterSubscription> {
    const updateData: any = {
      status,
    };

    // If status is being set to CONFIRMED, set confirmedAt timestamp
    if (status === NewsletterSubscriptionStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    }

    // If status is being set to ACTIVE and not yet confirmed, also set confirmedAt
    if (status === NewsletterSubscriptionStatus.ACTIVE && !updateData.confirmedAt) {
      updateData.confirmedAt = new Date();
    }

    const subscription = await this.prisma.newsletterSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    await this.logSubscriptionActivity(subscriptionId, 'subscription_status_updated', {
      status,
      subscriptionId,
    });

    return subscription;
  }

  /**
   * Update subscription status by userId
   */
  async updateSubscriptionStatusByUserId(
    userId: string,
    status: NewsletterSubscriptionStatus,
  ): Promise<NewsletterSubscription | null> {
    const subscription = await this.getSubscriptionStatus(userId);
    if (!subscription) {
      return null;
    }

    return this.updateSubscriptionStatus(subscription.id, status);
  }

  /**
   * Log subscription activity to IntegrationLog
   */
  private async logSubscriptionActivity(
    subscriptionId: string | null,
    event: string,
    payload: any,
  ): Promise<void> {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: { provider: 'KIEL_NEWSLETTER', isActive: true },
      });

      if (integration) {
        await this.prisma.integrationLog.create({
          data: {
            integrationId: integration.id,
            event,
            payload,
            status: event.includes('failed') ? 'FAILED' : 'SUCCESS',
            errorMessage: event.includes('failed') ? payload?.error : null,
          },
        });
      } else {
        // If no integration record exists, still try to log (might fail silently)
        this.logger.debug(`No KIEL_NEWSLETTER integration found for logging ${event}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to log subscription activity: ${event}`, error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
}
