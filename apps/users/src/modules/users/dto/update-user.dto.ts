import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(['USER', 'ADMIN', 'MODERATOR'])
  @IsOptional()
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
}
