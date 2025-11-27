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
  '@type': string;
  '@version': string;
  '@subtype': string;
  contactPoints: Array<{
    '@type': string;
    email: string;
    permission?: string;
  }>;
  attributes?: Record<string, string | boolean>;
  consent: {
    storage: {
      purposes: Record<string, string>; // Value is date (YYYY-MM-DD) or "AUTO"
    };
  };
}

interface CreateEventRequest {
  '@type': string;
  event: string; // Event name/identifier
  fireTime: string; // ISO 8601 date, duration, or 'Now'
  content?: Record<string, any>; // Optional event parameters
}

interface CreateContactResponse {
  href: string; // API returns href with contact URL, e.g., "https://ems-test.wilken.de/crm/api/v1/KP/contacts/153450338"
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
      // According to API docs: https://coop.wilken.digital/dokuwiki/doku.php?id=api:postcontacts
      const contactRequest: CreateContactRequest = {
        '@type': 'Contact',
        '@version': '0.2',
        '@subtype': 'Person',
        contactPoints: [
          {
            '@type': 'Email',
            email: email,
            permission: '10', // Permission for email (10 = preliminary consent, triggers Double-Opt-In)
          },
        ],
        attributes: {
          // Use attributeId as string key
          // API error indicates this attribute (3022526340) requires a boolean value
          // Setting to true to indicate newsletter signup via mein.Kiel App
          [config.attributeId.toString()]: true,
        },
        consent: {
          storage: {
            // Purposes is an object with purpose ID as key and date/<AUTO> as value
            // API requires: date (yyyy-MM-dd) later than today, OR literal "<AUTO>"
            // Client requirement: consent.storage.purposes → object 1005 (Newsletter subscription), date → AUTO
            purposes: {
              [config.consentPurposeId.toString()]: '<AUTO>', // <AUTO> = system will set the date automatically
            },
          },
        },
      };

      const contactUrl = `${config.hostUrl}contacts`;
      this.logger.debug(`Creating contact at ${contactUrl}`);

      // Try different authorization formats - EMS API might require Bearer token or X-API-Key
      // Start with raw API key (original format) as it might be what the API expects
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: config.apiKey, // Original format - raw API key
      };

      let contactResponse;
      try {
        contactResponse = await firstValueFrom(
          this.http.post<CreateContactResponse>(contactUrl, contactRequest, {
            headers,
            timeout: 30000,
          }),
        );
      } catch (error: any) {
        // Log detailed error information
        if (error.response) {
          const errorData = error.response.data;
          this.logger.error(
            `EMS API Error Response (${error.response.status}): ${JSON.stringify(errorData)}`,
            error,
            {
              status: error.response.status,
              statusText: error.response.statusText,
              data: errorData,
              requestUrl: contactUrl,
              requestHeaders: headers,
              requestBody: contactRequest,
            },
          );
        } else if (error.request) {
          this.logger.error('EMS API Request Error (no response)', error, {
            message: error.message,
            code: (error as any).code,
            requestUrl: contactUrl,
          });
        } else {
          this.logger.error('EMS API Error', error);
        }

        // Re-throw the error - no fallback authorization formats needed
        throw error;
      }

      // API returns { href: "https://ems-test.wilken.de/crm/api/v1/KP/contacts/153450338" }
      // Extract contact ID from href URL
      const href = contactResponse.data?.href;
      if (!href) {
        const missingHrefError = new Error('Contact created but no href returned from EMS API');
        this.logger.error('Contact response missing href', missingHrefError, {
          responseData: JSON.stringify(contactResponse.data, null, 2),
        });
        throw missingHrefError;
      }

      // Extract contact ID from href: /crm/api/v1/KIEL/contacts/{id}
      const hrefMatch = href.match(/\/contacts\/(\d+)$/);
      if (!hrefMatch || !hrefMatch[1]) {
        const invalidHrefError = new Error(`Invalid href format returned from EMS API: ${href}`);
        this.logger.error('Invalid href format', invalidHrefError, {
          href,
          responseData: JSON.stringify(contactResponse.data, null, 2),
        });
        throw invalidHrefError;
      }

      const contactIdString = hrefMatch[1];
      this.logger.log(`Contact created in EMS with ID: ${contactIdString} (from href: ${href})`);

      // Step 2: Trigger event
      // According to API docs: https://coop.wilken.digital/dokuwiki/doku.php?id=api:createevent
      // Using email endpoint: POST {host}/crm/api/v1/{mandator}/contacts/email/{email}/events
      // This is more reliable than using contact ID
      // Use explicit ISO timestamp instead of "Now" for better reliability
      // Format should match API example: 2018-11-28T15:48:00+0100 (no colon in timezone)
      const now = new Date();
      const fireTime = now
        .toISOString()
        .replace(/\.\d{3}Z$/, '+0000')
        .replace(/([+-])(\d{2}):(\d{2})$/, '$1$2$3'); // Format: 2018-11-28T15:48:00+0100

      const eventRequest: CreateEventRequest = {
        '@type': 'Event',
        event: config.eventId.toString(), // Event identifier as string (e.g., "3022526329")
        fireTime: fireTime, // ISO 8601 format with timezone
      };

      // Use email endpoint instead of contact ID endpoint
      // According to API docs example: POST /crm/api/v1/ENERGY/contacts/email/test@test.com/events
      // The API expects the email unencoded in the URL path
      const eventUrl = `${config.hostUrl}contacts/email/${email}/events`;
      this.logger.debug(`Triggering event at ${eventUrl}`);

      let eventTriggered = false;
      try {
        // Use same authorization format that worked for contact creation (raw API key)
        const eventHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: config.apiKey,
        };

        const eventResponse = await firstValueFrom(
          this.http.post(eventUrl, eventRequest, {
            headers: eventHeaders,
            timeout: 30000,
          }),
        );
        eventTriggered = true;
        this.logger.log(
          `Event triggered for contact ${contactIdString} (email: ${email}) - Status: ${eventResponse.status} ${eventResponse.statusText}`,
        );
      } catch (error: any) {
        if (error.response) {
          const errorData = error.response.data;
          this.logger.error(
            `Failed to trigger event for contact ${contactIdString} (email: ${email}) (${error.response.status}): ${JSON.stringify(errorData)}`,
            error,
            {
              status: error.response.status,
              statusText: error.response.statusText,
              data: errorData,
              requestUrl: eventUrl,
              requestBody: eventRequest,
              email,
              contactId: contactIdString,
            },
          );
        } else {
          this.logger.error(
            `Failed to trigger event for contact ${contactIdString} (email: ${email})`,
            error,
          );
        }
        // Continue even if event trigger fails - contact is already created
      }

      // Step 3: Create subscription record in database
      const subscription = await this.prisma.newsletterSubscription.create({
        data: {
          userId,
          email,
          emsContactId: contactIdString, // Store as string
          status: NewsletterSubscriptionStatus.PENDING,
          emsEventTriggered: eventTriggered,
        },
      });

      // Log the activity
      await this.logSubscriptionActivity(subscription.id, 'newsletter_subscription', {
        email,
        contactId: contactIdString,
        eventTriggered,
      });

      this.logger.log(
        `Newsletter subscription created for user ${userId} with ID: ${subscription.id}`,
      );

      return subscription;
    } catch (error: any) {
      // Enhanced error logging
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        userId,
        email,
      };

      if (error.response) {
        errorDetails.apiError = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        };
      }

      this.logger.error(`Failed to subscribe ${email} to newsletter`, error, errorDetails);

      // Log the error
      try {
        await this.logSubscriptionActivity(null, 'newsletter_subscription_failed', {
          userId,
          email,
          error: error?.message || 'Unknown error',
          apiError: error.response?.data || null,
          statusCode: error.response?.status || null,
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
