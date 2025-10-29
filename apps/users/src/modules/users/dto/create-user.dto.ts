import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(['USER', 'ADMIN', 'MODERATOR'])
  @IsOptional()
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
}
