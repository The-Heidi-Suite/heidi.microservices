import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Whether the user accepts push notifications for favorite event reminders',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  notificationsEnabled: boolean;
}

// Data payload for notification preferences
export class NotificationPreferencesDataDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

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

// Full response wrapper for GET /me/notifications
export class GetNotificationPreferencesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: NotificationPreferencesDataDto })
  data: NotificationPreferencesDataDto;

  @ApiProperty({
    example: 'Notification preferences retrieved successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/me/notifications' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Full response wrapper for PATCH /me/notifications
export class UpdateNotificationPreferencesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: NotificationPreferencesDataDto })
  data: NotificationPreferencesDataDto;

  @ApiProperty({
    example: 'Notification preferences updated successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/me/notifications' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Keep backwards compatibility
export { NotificationPreferencesDataDto as NotificationPreferencesResponseDto };
