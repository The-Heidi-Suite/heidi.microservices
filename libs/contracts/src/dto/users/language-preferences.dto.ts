import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SUPPORTED_LANGUAGES = ['de', 'en', 'dk', 'no', 'se', 'ar', 'fa', 'tr', 'ru', 'uk'] as const;

export class UpdateLanguagePreferenceDto {
  @ApiProperty({
    description: 'Preferred language code (ISO 639-1)',
    example: 'de',
    enum: SUPPORTED_LANGUAGES,
  })
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES, {
    message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  })
  preferredLanguage: string;
}

// Data payload for language preference
export class LanguagePreferenceDataDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Preferred language code (ISO 639-1)',
    example: 'de',
  })
  preferredLanguage: string;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: string;
}

// Full response wrapper for PATCH /me/language
export class UpdateLanguagePreferenceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: LanguagePreferenceDataDto })
  data: LanguagePreferenceDataDto;

  @ApiProperty({
    example: 'Language preference updated successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/me/language' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

