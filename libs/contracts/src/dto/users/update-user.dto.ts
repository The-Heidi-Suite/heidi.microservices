import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client-users';

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

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
