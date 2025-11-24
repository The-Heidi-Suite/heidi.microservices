import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client-users';

export class DeviceDto {
  @ApiProperty({
    description: 'Device ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Device identifier from client',
    example: 'device-uuid-123',
  })
  deviceId?: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.IOS,
  })
  platform: DevicePlatform;

  @ApiPropertyOptional({
    description: 'App version',
    example: '1.2.3',
  })
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: 'iOS 17.0',
  })
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Device language',
    example: 'en',
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'City ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cityId?: string;

  @ApiProperty({
    description: 'Last seen timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  lastSeenAt: string;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;
}

export class DeviceListResponseDto {
  @ApiProperty({
    description: 'List of devices',
    type: [DeviceDto],
  })
  devices: DeviceDto[];
}

export class RegisterDeviceResponseDto {
  @ApiProperty({
    description: 'Registered device',
    type: DeviceDto,
  })
  device: DeviceDto;
}

export class DeleteDeviceResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;
}
