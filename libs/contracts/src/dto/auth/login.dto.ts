import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address or username for login',
    example: 'user@example.com',
    examples: {
      email: {
        value: 'user@example.com',
        description: 'Login with email address',
      },
      username: {
        value: 'johndoe',
        description: 'Login with username',
      },
    },
    oneOf: [
      { type: 'string', format: 'email' },
      { type: 'string', pattern: '^[a-zA-Z0-9_]+$' },
    ],
  })
  @IsString()
  email: string; // Note: This field accepts both email and username

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me - if true, session will be kept for 30 days instead of 7 days',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
