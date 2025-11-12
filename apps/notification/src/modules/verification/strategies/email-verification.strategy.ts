import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { IVerificationStrategy } from './verification-strategy.interface';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { I18nService } from '@heidi/i18n';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationStrategy implements IVerificationStrategy {
  private readonly baseUrl: string;

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly i18nService: I18nService,
  ) {
    // Use API gateway URL if configured, otherwise fallback to direct service URL
    const apiGatewayBaseUrl = this.configService.get<string>('apiGatewayBaseUrl');
    const apiPrefix = this.configService.get<string>('apiPrefix', 'api');

    if (apiGatewayBaseUrl) {
      // Use API gateway URL with /api/notification prefix
      this.baseUrl = `${apiGatewayBaseUrl}/${apiPrefix}/notification`;
    } else {
      // Fallback to direct service URL for local development
      const notificationPort = this.configService.get<number>('notification.port', 3005);
      const host = process.env.NOTIFICATION_HOST || 'localhost';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      this.baseUrl = `${protocol}://${host}:${notificationPort}`;
    }
    this.logger.setContext(EmailVerificationStrategy.name);
  }

  generateToken(): string {
    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    return crypto.randomBytes(32).toString('hex');
  }

  validateIdentifier(identifier: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  }

  async sendVerification(
    identifier: string,
    token: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const verificationLink = `${this.baseUrl}/verification/verify?token=${token}`;
    const cancelLink = `${this.baseUrl}/verification/cancel?token=${token}`;

    const preferredLanguage =
      metadata?.preferredLanguage || metadata?.language || metadata?.locale || undefined;

    const emailSubject = this.i18nService.translate(
      'emails.verification.subject',
      undefined,
      preferredLanguage,
    );

    const emailContent = this.generateEmailContent(
      verificationLink,
      cancelLink,
      metadata?.firstName,
      emailSubject,
      preferredLanguage,
    );

    // Send welcome email with verification link
    await this.client.emit(RabbitMQPatterns.NOTIFICATION_SEND, {
      userId,
      type: 'INFO',
      channel: 'EMAIL',
      subject: emailSubject,
      content: emailContent,
      metadata: {
        ...metadata,
        recipientEmail: identifier, // Add recipient email for email delivery
        verificationType: 'EMAIL_VERIFICATION',
        verificationToken: token,
        verificationLink,
        cancelLink,
        template: 'welcome-verification',
      },
    });

    this.logger.log(`Email verification sent to ${identifier} for user ${userId}`);
  }

  private generateEmailContent(
    verificationLink: string,
    cancelLink: string,
    firstName: string | undefined,
    emailSubject: string,
    preferredLanguage?: string,
  ): string {
    const firstNamePart = firstName ? `, ${firstName}` : '';
    const greeting = this.i18nService.translate(
      'emails.verification.greeting',
      { firstNamePart },
      preferredLanguage,
    );
    const intro = this.i18nService.translate(
      'emails.verification.intro',
      undefined,
      preferredLanguage,
    );
    const ctaText = this.i18nService.translate(
      'emails.verification.cta',
      undefined,
      preferredLanguage,
    );
    const expiryNotice = this.i18nService.translate(
      'emails.verification.expiryNotice',
      undefined,
      preferredLanguage,
    );
    const cancelText = this.i18nService.translate(
      'emails.verification.cancelText',
      undefined,
      preferredLanguage,
    );
    const cancelLinkText = this.i18nService.translate(
      'emails.verification.cancelLinkText',
      undefined,
      preferredLanguage,
    );
    const fallback = this.i18nService.translate(
      'emails.verification.fallback',
      undefined,
      preferredLanguage,
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSubject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h1 style="color: #2c3e50;">${greeting}</h1>

          <p>${intro}</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${ctaText}
            </a>
          </div>

          <p style="font-size: 14px; color: #7f8c8d;">
            ${expiryNotice}
          </p>

          <p style="font-size: 12px; color: #95a5a6; margin-top: 30px; border-top: 1px solid #ecf0f1; padding-top: 20px;">
            ${cancelText}
            <a href="${cancelLink}" style="color: #e74c3c;">${cancelLinkText}</a>.
          </p>

          <p style="font-size: 12px; color: #95a5a6; margin-top: 10px;">
            ${fallback}<br>
            <span style="word-break: break-all; color: #3498db;">${verificationLink}</span>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  getType(): 'EMAIL' {
    return 'EMAIL';
  }
}
