import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class ResendVerificationDto {
  @IsString()
  userId: string;

  @IsEnum(['EMAIL', 'SMS'])
  type: 'EMAIL' | 'SMS';

  @IsString()
  identifier: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
