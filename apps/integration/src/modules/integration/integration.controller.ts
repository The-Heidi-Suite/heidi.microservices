import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsEmail, IsUUID } from 'class-validator';
import { IntegrationService } from './integration.service';
import {
  GetIntegrationsResponseDto,
  GetIntegrationByIdResponseDto,
  IntegrationNotFoundErrorResponseDto,
  SyncIntegrationResponseDto,
  NewsletterSubscriptionResponseDto,
  NewsletterSubscriptionConflictErrorResponseDto,
  NewsletterSubscriptionValidationErrorResponseDto,
  NewsletterSubscriptionInternalErrorResponseDto,
} from '@heidi/contracts';
import { JwtAuthGuard, Public } from '@heidi/jwt';
import { SuperAdminOnly, AdminOnlyGuard } from '@heidi/rbac';

class SubscribeNewsletterDto {
  @ApiProperty({
    description: 'User ID for the newsletter subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Email address to subscribe to the newsletter',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;
}

@ApiTags('integration')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('integrations')
  @SuperAdminOnly()
  @ApiOperation({
    summary: 'List integrations',
    description: 'Retrieve all configured integrations (Super Admin only)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationsResponseDto })
  async findAll() {
    return this.integrationService.findAll();
  }

  @Get('integrations/:id')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get integration by ID (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationByIdResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: IntegrationNotFoundErrorResponseDto })
  async findOne(@Param('id') id: string) {
    return this.integrationService.findOne(id);
  }

  @Post('integrations/:id/sync')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Trigger synchronization for an integration (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: SyncIntegrationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: IntegrationNotFoundErrorResponseDto })
  async syncIntegration(@Param('id') id: string) {
    return this.integrationService.syncIntegration(id);
  }

  @Post('webhooks/:provider')
  @Public()
  @ApiOperation({ summary: 'Handle incoming webhooks from integrations' })
  @ApiParam({
    name: 'provider',
    description: 'Integration provider key',
    example: 'destination-one',
  })
  @ApiBody({
    description: 'Webhook payload',
    schema: { example: { event: 'update', data: { id: '123' } } },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed' })
  async handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    return this.integrationService.handleWebhook(provider, payload);
  }

  @Post('newsletter/subscribe')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to newsletter',
    description: 'Subscribe a user email to the Kiel newsletter via E-Marketing Suite',
  })
  @ApiBody({
    description: 'Newsletter subscription request',
    type: SubscribeNewsletterDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Newsletter subscription successful',
    type: NewsletterSubscriptionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email address or userId',
    type: NewsletterSubscriptionValidationErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already subscribed to the newsletter',
    type: NewsletterSubscriptionConflictErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to subscribe to newsletter',
    type: NewsletterSubscriptionInternalErrorResponseDto,
  })
  async subscribeToNewsletter(@Body() body: SubscribeNewsletterDto) {
    return this.integrationService.subscribeToNewsletter(body.userId, body.email);
  }
}
