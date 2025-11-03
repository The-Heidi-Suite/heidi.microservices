import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client-core';

export class AssignCityAdminDto {
  @ApiProperty({
    description: 'User ID to assign as city admin',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'City ID to assign admin to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({
    description: 'Role to assign (CITY_ADMIN or ADMIN)',
    enum: UserRole,
    example: UserRole.CITY_ADMIN,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
