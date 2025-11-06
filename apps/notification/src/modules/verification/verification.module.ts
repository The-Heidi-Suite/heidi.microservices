import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationMessageController } from './verification-message.controller';
import { VerificationService } from './verification.service';
import { EmailVerificationStrategy } from './strategies/email-verification.strategy';
import { SmsVerificationStrategy } from './strategies/sms-verification.strategy';

@Module({
  controllers: [VerificationController, VerificationMessageController],
  providers: [VerificationService, EmailVerificationStrategy, SmsVerificationStrategy],
  exports: [VerificationService],
})
export class VerificationModule {}
