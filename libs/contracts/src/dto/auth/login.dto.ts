import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
