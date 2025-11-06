import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import {
  SendVerificationDto,
  VerifyTokenDto,
  ResendVerificationDto,
  CancelVerificationDto,
} from './dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send verification link' })
  @ApiBody({ type: SendVerificationDto })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.verificationService.sendVerification(dto);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify email using token from link' })
  @ApiQuery({ name: 'token', type: String })
  async verifyTokenGet(@Query('token') token: string) {
    return this.verificationService.verifyToken({ token });
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using token (POST)' })
  @ApiBody({ type: VerifyTokenDto })
  async verifyTokenPost(@Body() dto: VerifyTokenDto) {
    return this.verificationService.verifyToken(dto);
  }

  @Get('cancel')
  @ApiOperation({ summary: "Cancel verification (It's not me)" })
  @ApiQuery({ name: 'token', type: String })
  async cancelVerificationGet(@Query('token') token: string) {
    return this.verificationService.cancelVerification({ token });
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel verification (POST)' })
  @ApiBody({ type: CancelVerificationDto })
  async cancelVerificationPost(@Body() dto: CancelVerificationDto) {
    return this.verificationService.cancelVerification(dto);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification link' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.verificationService.resendVerification(dto);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Get verification status' })
  @ApiQuery({ name: 'type', enum: ['EMAIL', 'SMS'], required: true })
  async getStatus(@Param('userId') userId: string, @Query('type') type: 'EMAIL' | 'SMS') {
    return this.verificationService.getVerificationStatus(userId, type);
  }
}
