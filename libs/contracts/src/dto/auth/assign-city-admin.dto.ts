import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client-core';

export class AssignCityAdminDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  cityId: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
