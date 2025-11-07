import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@heidi/config';
import { IVerificationStrategy } from './verification-strategy.interface';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationStrategy implements IVerificationStrategy {
  private readonly baseUrl: string;

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
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

    // Send welcome email with verification link
    await this.client.emit(RabbitMQPatterns.NOTIFICATION_SEND, {
      userId,
      type: 'INFO',
      channel: 'EMAIL',
      subject: 'Welcome! Please verify your email address',
      content: this.generateEmailContent(verificationLink, cancelLink, metadata?.firstName),
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
    firstName?: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome! Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h1 style="color: #2c3e50;">Welcome${firstName ? `, ${firstName}` : ''}!</h1>

          <p>Thank you for registering with us. To complete your registration and secure your account, please verify your email address.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <p style="font-size: 14px; color: #7f8c8d;">
            <strong>Important:</strong> This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email or click the link below to cancel.
          </p>

          <p style="font-size: 12px; color: #95a5a6; margin-top: 30px; border-top: 1px solid #ecf0f1; padding-top: 20px;">
            If you didn't create this account, please
            <a href="${cancelLink}" style="color: #e74c3c;">click here to cancel</a>.
          </p>

          <p style="font-size: 12px; color: #95a5a6; margin-top: 10px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
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
