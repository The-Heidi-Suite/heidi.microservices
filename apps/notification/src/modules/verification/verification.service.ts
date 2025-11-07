import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { PrismaNotificationService } from '@heidi/prisma';
import { LoggerService } from '@heidi/logger';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { EmailVerificationStrategy } from './strategies/email-verification.strategy';
import { SmsVerificationStrategy } from './strategies/sms-verification.strategy';
import { IVerificationStrategy } from './strategies/verification-strategy.interface';
import {
  SendVerificationDto,
  VerifyTokenDto,
  ResendVerificationDto,
  CancelVerificationDto,
} from '@heidi/contracts';

@Injectable()
export class VerificationService {
  private readonly strategies: Map<'EMAIL' | 'SMS', IVerificationStrategy>;
  private readonly TOKEN_EXPIRY_HOURS = 24; // Industry standard: 24 hours
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly prisma: PrismaNotificationService,
    private readonly emailStrategy: EmailVerificationStrategy,
    private readonly smsStrategy: SmsVerificationStrategy,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly logger: LoggerService,
  ) {
    this.strategies = new Map<'EMAIL' | 'SMS', IVerificationStrategy>([
      ['EMAIL', this.emailStrategy],
      ['SMS', this.smsStrategy],
    ]);
    this.logger.setContext(VerificationService.name);
  }

  /**
   * Send verification link to user (automatically called after registration)
   */
  async sendVerification(dto: SendVerificationDto) {
    const strategy = this.strategies.get(dto.type);
    if (!strategy) {
      throw new BadRequestException(`Unsupported verification type: ${dto.type}`);
    }

    // Validate identifier format
    if (!strategy.validateIdentifier(dto.identifier)) {
      throw new BadRequestException(`Invalid ${dto.type.toLowerCase()} format`);
    }

    // Cancel any existing pending verification for this user/identifier
    await this.prisma.verificationToken.updateMany({
      where: {
        userId: dto.userId,
        identifier: dto.identifier,
        type: dto.type,
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    });

    // Generate secure token
    const token = strategy.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Create verification record
    const verificationToken = await this.prisma.verificationToken.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        channel: dto.type,
        token,
        identifier: dto.identifier,
        expiresAt,
        maxAttempts: this.MAX_ATTEMPTS,
        status: 'PENDING',
        metadata: dto.metadata || {},
      },
    });

    // Send verification via appropriate channel (includes welcome email for EMAIL type)
    await strategy.sendVerification(dto.identifier, token, dto.userId, {
      ...dto.metadata,
      verificationTokenId: verificationToken.id,
    });

    // Emit verification sent event
    this.client.emit(RabbitMQPatterns.VERIFICATION_SENT, {
      userId: dto.userId,
      type: dto.type,
      identifier: dto.identifier,
      verificationTokenId: verificationToken.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Verification ${dto.type} sent to ${dto.identifier} for user ${dto.userId}`);

    return {
      id: verificationToken.id,
      type: dto.type,
      identifier: dto.identifier,
      expiresAt: verificationToken.expiresAt,
      message: `Verification link sent to your ${dto.type.toLowerCase()}`,
    };
  }

  /**
   * Verify token from email link
   */
  async verifyToken(dto: VerifyTokenDto) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!verificationToken) {
      throw new NotFoundException('Invalid verification token');
    }

    // Check if already used (one-time use)
    if (verificationToken.isUsed || verificationToken.status === 'VERIFIED') {
      throw new BadRequestException('This verification link has already been used');
    }

    // Check if cancelled
    if (verificationToken.status === 'CANCELLED') {
      throw new BadRequestException('This verification link has been cancelled');
    }

    // Check if expired
    if (new Date() > verificationToken.expiresAt) {
      await this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnprocessableEntityException(
        'Verification link has expired. Please request a new verification email.',
      );
    }

    // Check attempts
    if (verificationToken.attempts >= verificationToken.maxAttempts) {
      await this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { status: 'FAILED' },
      });
      throw new UnprocessableEntityException('Maximum verification attempts exceeded');
    }

    // Mark as verified
    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        isUsed: true,
        attempts: { increment: 1 },
      },
    });

    // Emit verification verified event
    this.client.emit(RabbitMQPatterns.VERIFICATION_VERIFIED, {
      userId: verificationToken.userId,
      type: verificationToken.type,
      identifier: verificationToken.identifier,
      verifiedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Verification ${verificationToken.type} verified for user ${verificationToken.userId}`,
    );

    return {
      verified: true,
      type: verificationToken.type,
      identifier: verificationToken.identifier,
      userId: verificationToken.userId,
      verifiedAt: new Date(),
    };
  }

  /**
   * Cancel verification (It's not me)
   */
  async cancelVerification(dto: CancelVerificationDto) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!verificationToken) {
      throw new NotFoundException('Invalid verification token');
    }

    if (verificationToken.status === 'VERIFIED') {
      throw new BadRequestException('Cannot cancel an already verified token');
    }

    if (verificationToken.status === 'CANCELLED') {
      return {
        cancelled: true,
        message: 'This verification link has already been cancelled',
      };
    }

    // Mark as cancelled
    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Emit verification cancelled event
    this.client.emit(RabbitMQPatterns.VERIFICATION_CANCELLED, {
      userId: verificationToken.userId,
      type: verificationToken.type,
      identifier: verificationToken.identifier,
      cancelledAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Verification ${verificationToken.type} cancelled for user ${verificationToken.userId}`,
    );

    return {
      cancelled: true,
      message: 'Verification has been cancelled. If this was not you, your account may be at risk.',
    };
  }

  /**
   * Resend verification link (if expired or user requests new one)
   */
  async resendVerification(dto: ResendVerificationDto) {
    // Check if there's a recent verification that's expired
    const existingToken = await this.prisma.verificationToken.findFirst({
      where: {
        userId: dto.userId,
        type: dto.type,
        identifier: dto.identifier,
        status: { in: ['PENDING', 'EXPIRED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If expired, allow resend. If pending and not expired, inform user
    if (existingToken && existingToken.status === 'PENDING') {
      const isExpired = new Date() > existingToken.expiresAt;
      if (!isExpired) {
        throw new BadRequestException(
          'A verification email has already been sent. Please check your inbox or wait until it expires.',
        );
      }
    }

    return this.sendVerification({
      userId: dto.userId,
      type: dto.type,
      identifier: dto.identifier,
      metadata: {
        ...dto.metadata,
        isResend: true,
      },
    });
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string, type: 'EMAIL' | 'SMS') {
    const verification = await this.prisma.verificationToken.findFirst({
      where: {
        userId,
        type,
        status: 'VERIFIED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return { verified: false, status: 'NOT_VERIFIED' };
    }

    return {
      verified: true,
      status: verification.status,
      identifier: verification.identifier,
      verifiedAt: verification.verifiedAt,
    };
  }
}
