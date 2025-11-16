import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { I18nService } from '@heidi/i18n';
import { CityEmailThemeService } from '../../verification/services/city-email-theme.service';
import { CityEmailTheme } from '../../verification/config/default-email-theme.config';
import * as crypto from 'crypto';

@Injectable()
export class EmailPasswordResetStrategy {
  private readonly webBaseUrl: string;
  private readonly defaultExpiryHours: number;

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly i18nService: I18nService,
    private readonly cityEmailThemeService: CityEmailThemeService,
  ) {
    // Get web base URL from config (CLIENT_URL or frontendBaseUrl)
    this.webBaseUrl =
      this.configService.get<string>('frontendBaseUrl') ||
      this.configService.get<string>('clientURL') ||
      'http://localhost:4200';

    // Get default expiry hours from config
    this.defaultExpiryHours = this.configService.get<number>('passwordReset.expiryHours') || 1;

    this.logger.setContext(EmailPasswordResetStrategy.name);
  }

  generateToken(): string {
    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    return crypto.randomBytes(32).toString('hex');
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const resetLink = `${this.webBaseUrl}/reset-password/${token}`;

    const preferredLanguage =
      metadata?.preferredLanguage || metadata?.language || metadata?.locale || undefined;

    // Get city theme configuration
    const cityId = metadata?.cityId || null;
    const cityTheme = await this.cityEmailThemeService.getCityTheme(cityId);

    // Generate greeting with app name from theme
    const appName = cityTheme.appName || 'Heidi';
    const greetingTemplate = cityTheme.greetingTemplate || 'Hello{firstNamePart}!';
    const firstNamePart = metadata?.firstName ? ` ${metadata.firstName}` : '';
    const greeting = greetingTemplate
      .replace('{appName}', appName)
      .replace('{firstNamePart}', firstNamePart);

    // Get subject with app name
    const subjectTemplate = this.i18nService.translate(
      'emails.passwordReset.subject',
      { appName },
      preferredLanguage,
    );
    const emailSubject = subjectTemplate || `Reset Your ${appName} Password`;

    const emailContent = this.generateEmailContent(
      resetLink,
      metadata?.firstName,
      emailSubject,
      preferredLanguage,
      cityTheme,
      greeting,
      metadata?.expiryHours || this.defaultExpiryHours,
    );

    // Send password reset email
    await this.client.emit(RabbitMQPatterns.NOTIFICATION_SEND, {
      userId,
      type: 'INFO',
      channel: 'EMAIL',
      subject: emailSubject,
      content: emailContent,
      metadata: {
        ...metadata,
        recipientEmail: email,
        resetType: 'PASSWORD_RESET',
        resetToken: token,
        resetLink,
        template: 'password-reset',
      },
    });

    this.logger.log(`Password reset email sent to ${email} for user ${userId}`);
  }

  private generateEmailContent(
    resetLink: string,
    firstName: string | undefined,
    emailSubject: string,
    preferredLanguage: string | undefined,
    cityTheme: CityEmailTheme,
    greeting: string,
    expiryHours: number,
  ): string {
    const intro =
      this.i18nService.translate('emails.passwordReset.intro', undefined, preferredLanguage) ||
      'We received a request to reset your password. Click the button below to reset it.';
    const ctaText =
      this.i18nService.translate('emails.passwordReset.cta', undefined, preferredLanguage) ||
      'Reset Password';

    // Dynamic expiry notice based on hours
    const expiryText = expiryHours === 1 ? '1 hour' : `${expiryHours} hours`;
    const expiryNotice =
      this.i18nService.translate(
        'emails.passwordReset.expiryNotice',
        undefined,
        preferredLanguage,
      ) || `This link will expire in ${expiryText}.`;
    const securityNotice =
      this.i18nService.translate(
        'emails.passwordReset.securityNotice',
        undefined,
        preferredLanguage,
      ) ||
      'If you did not request a password reset, please ignore this email. Your password will remain unchanged.';
    const fallback =
      this.i18nService.translate('emails.passwordReset.fallback', undefined, preferredLanguage) ||
      'If the button does not work, copy and paste this link into your browser:';

    // Use city theme colors or defaults
    const headerBackgroundColor =
      cityTheme.emailTheme?.headerBackgroundColor || cityTheme.secondaryColor || '#1a1a2e';
    const footerBackgroundColor =
      cityTheme.emailTheme?.footerBackgroundColor || cityTheme.primaryColor || '#009EE0';
    const buttonColor = cityTheme.emailTheme?.buttonColor || '#ffffff';
    const buttonTextColor =
      cityTheme.emailTheme?.buttonTextColor || cityTheme.primaryColor || '#009EE0';
    const accentColor = cityTheme.accentColor || '#009EE0';

    // Generate email template with city theme
    return `
      <!DOCTYPE html>
      <html lang="${preferredLanguage || 'en'}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${emailSubject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header section -->
                <tr>
                  <td style="background-color: ${headerBackgroundColor}; padding: 40px 30px 60px 30px; text-align: left;">
                    <h1 style="margin: 0 0 20px 0; color: #ffffff; font-size: 32px; font-weight: bold; line-height: 1.2; font-family: Arial, Helvetica, sans-serif;">
                      ${greeting}
                    </h1>
                    <p style="margin: 0 0 30px 0; color: #ffffff; font-size: 16px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                      ${intro}
                    </p>
                  </td>
                </tr>
                <!-- CTA section -->
                <tr>
                  <td style="background-color: ${footerBackgroundColor}; padding: 40px 30px; text-align: center; position: relative;">
                    <div style="margin-bottom: 30px;">
                      <a href="${resetLink}"
                         style="background-color: ${buttonColor}; color: ${buttonTextColor}; padding: 16px 40px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: bold; font-size: 18px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); border: 2px solid ${buttonColor};">
                        ${ctaText}
                      </a>
                    </div>
                    <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 14px; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                      ${expiryNotice}
                    </p>
                  </td>
                </tr>
                <!-- Footer section -->
                <tr>
                  <td style="background-color: #ffffff; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 15px 0; color: #666666; font-size: 13px; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                      ${securityNotice}
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                      ${fallback}<br>
                      <a href="${resetLink}" style="color: ${accentColor}; text-decoration: underline; word-break: break-all;">${resetLink}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
