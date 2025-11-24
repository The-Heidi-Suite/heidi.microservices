import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeTopicDto {
  @ApiProperty({
    description: 'Topic key (e.g., "CITY_123", "GLOBAL_EVENTS", "ANNOUNCEMENTS")',
    example: 'CITY_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  topicKey: string;

  @ApiPropertyOptional({
    description: 'City ID (for city-specific topics)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  cityId?: string;
}

export class TopicSubscriptionDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Topic key',
    example: 'CITY_123e4567-e89b-12d3-a456-426614174000',
  })
  topicKey: string;

  @ApiPropertyOptional({
    description: 'City ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cityId?: string;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;
}

export class TopicSubscriptionListResponseDto {
  @ApiProperty({
    description: 'List of topic subscriptions',
    type: [TopicSubscriptionDto],
  })
  subscriptions: TopicSubscriptionDto[];
}

export class SubscribeTopicResponseDto {
  @ApiProperty({
    description: 'Topic subscription',
    type: TopicSubscriptionDto,
  })
  subscription: TopicSubscriptionDto;
}

export class UnsubscribeTopicResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;
}
