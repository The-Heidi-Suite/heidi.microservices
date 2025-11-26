import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsletterSubscriptionDto } from '../integrations/newsletter-subscription-response.dto';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Subscribe or unsubscribe from newsletter',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  newsletterSubscribed?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user accepts push notifications for favorite event reminders',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

// Data payload for preferences
export class PreferencesDataDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Newsletter subscription information',
    type: NewsletterSubscriptionDto,
  })
  newsletterSubscription?: NewsletterSubscriptionDto | null;

  @ApiProperty({
    description: 'Whether push notifications are enabled for favorite event reminders',
    example: true,
    type: Boolean,
  })
  notificationsEnabled: boolean;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: string;
}

// Full response wrapper for PATCH /me/preferences
export class UpdatePreferencesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PreferencesDataDto })
  data: PreferencesDataDto;

  @ApiProperty({
    example: 'Preferences updated successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/me/preferences' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}
