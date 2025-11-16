import { Controller, Post, Get, Body, Param, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import {
  GetIntegrationsResponseDto,
  GetIntegrationByIdResponseDto,
  IntegrationNotFoundErrorResponseDto,
  SyncIntegrationResponseDto,
} from '@heidi/contracts';
import { JwtAuthGuard, Public } from '@heidi/jwt';
import { SuperAdminOnly, AdminOnlyGuard } from '@heidi/rbac';

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
}
