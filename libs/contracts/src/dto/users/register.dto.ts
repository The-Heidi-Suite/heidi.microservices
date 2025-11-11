import { IsEmail, IsString, MinLength, IsOptional, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'User email address (required for registration, optional for guest conversion)',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Username (alphanumeric and underscores, 3-30 characters) (required for registration, optional for guest conversion)',
    example: 'johndoe',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  })
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'User password (required for registration, optional for guest conversion)',
    example: 'password123',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'City ID to associate with user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  cityId?: string;
}
