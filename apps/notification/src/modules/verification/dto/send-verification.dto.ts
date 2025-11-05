import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class SendVerificationDto {
  @IsString()
  userId: string;

  @IsEnum(['EMAIL', 'SMS'])
  type: 'EMAIL' | 'SMS';

  @IsString()
  identifier: string; // email address or phone number

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
