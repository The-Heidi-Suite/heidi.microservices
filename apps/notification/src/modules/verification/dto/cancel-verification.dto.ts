import { IsString } from 'class-validator';

export class CancelVerificationDto {
  @IsString()
  token: string;
}
