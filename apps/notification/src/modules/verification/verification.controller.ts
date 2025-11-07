import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import {
  SendVerificationDto,
  VerifyTokenDto,
  ResendVerificationDto,
  CancelVerificationDto,
  VerifyTokenResponseDto,
  SendVerificationResponseDto,
  CancelVerificationResponseDto,
  VerificationNotFoundErrorResponseDto,
  VerificationBadRequestErrorResponseDto,
  VerificationExpiredErrorResponseDto,
} from '@heidi/contracts';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send email verification link',
    description:
      'Send a verification email to the user. The email contains a secure verification link that expires in 24 hours. This endpoint is typically called automatically after user registration.',
  })
  @ApiBody({
    type: SendVerificationDto,
    examples: {
      emailVerification: {
        summary: 'Send email verification',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'EMAIL',
          identifier: 'user@example.com',
          metadata: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: SendVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid email format or unsupported verification type',
    type: VerificationBadRequestErrorResponseDto,
  })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.verificationService.sendVerification(dto);
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Verify email using token from link (GET)',
    description:
      'Verify email address using the token from the verification link. This endpoint is typically accessed when the user clicks the verification link in their email. The token is valid for 24 hours and can only be used once.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Verification token from the email link',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - token already used or cancelled',
    type: VerificationBadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid verification token',
    type: VerificationNotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 422,
    description: 'Verification link has expired',
    type: VerificationExpiredErrorResponseDto,
  })
  async verifyTokenGet(@Query('token') token: string) {
    return this.verificationService.verifyToken({ token });
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email using token (POST)',
    description:
      'Verify email address using the verification token. This endpoint accepts the token in the request body. The token is valid for 24 hours and can only be used once.',
  })
  @ApiBody({
    type: VerifyTokenDto,
    examples: {
      verifyEmail: {
        summary: 'Verify email with token',
        value: {
          token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - token already used or cancelled',
    type: VerificationBadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid verification token',
    type: VerificationNotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 422,
    description: 'Verification link has expired',
    type: VerificationExpiredErrorResponseDto,
  })
  async verifyTokenPost(@Body() dto: VerifyTokenDto) {
    return this.verificationService.verifyToken(dto);
  }

  @Get('cancel')
  @ApiOperation({
    summary: "Cancel verification (It's not me) - GET",
    description:
      'Cancel a verification request if the user did not initiate it. This endpoint is typically accessed from the "It\'s not me" link in the verification email.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Verification token to cancel',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification cancelled successfully',
    type: CancelVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot cancel already verified token',
    type: VerificationBadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid verification token',
    type: VerificationNotFoundErrorResponseDto,
  })
  async cancelVerificationGet(@Query('token') token: string) {
    return this.verificationService.cancelVerification({ token });
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel verification (POST)',
    description:
      'Cancel a verification request if the user did not initiate it. This endpoint accepts the token in the request body.',
  })
  @ApiBody({
    type: CancelVerificationDto,
    examples: {
      cancelVerification: {
        summary: 'Cancel verification',
        value: {
          token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification cancelled successfully',
    type: CancelVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot cancel already verified token',
    type: VerificationBadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid verification token',
    type: VerificationNotFoundErrorResponseDto,
  })
  async cancelVerificationPost(@Body() dto: CancelVerificationDto) {
    return this.verificationService.cancelVerification(dto);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resend a verification email if the previous one expired or was not received. A new verification link will be sent with a fresh 24-hour expiration.',
  })
  @ApiBody({
    type: ResendVerificationDto,
    examples: {
      resendEmail: {
        summary: 'Resend email verification',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'EMAIL',
          identifier: 'user@example.com',
          metadata: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent successfully',
    type: SendVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - verification email already sent and not expired',
    type: VerificationBadRequestErrorResponseDto,
  })
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
