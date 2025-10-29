import { IsString, IsNumber, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateCityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  population?: number;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
