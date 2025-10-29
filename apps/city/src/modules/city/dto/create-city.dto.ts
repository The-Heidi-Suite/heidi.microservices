import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateCityDto {
  @IsString()
  name: string;

  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  population?: number;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
