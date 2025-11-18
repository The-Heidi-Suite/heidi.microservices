import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
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
    description: 'Profile photo URL',
    example: 'https://storage.example.com/users/user123/profile-photo.webp',
  })
  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({
    description: 'Preferred language code (ISO 639-1, e.g., en, de, ar)',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  preferredLanguage?: string;
}
