import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address or username',
    example: 'user@example.com',
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
