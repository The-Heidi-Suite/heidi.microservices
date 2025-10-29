import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'ALERT'])
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'ALERT';

  @IsEnum(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  content: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
