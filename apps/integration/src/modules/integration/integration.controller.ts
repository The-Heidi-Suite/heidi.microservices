import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('integrations')
  async findAll() {
    return this.integrationService.findAll();
  }

  @Get('integrations/:id')
  async findOne(@Param('id') id: string) {
    return this.integrationService.findOne(id);
  }

  @Post('integrations/:id/sync')
  async syncIntegration(@Param('id') id: string) {
    return this.integrationService.syncIntegration(id);
  }

  @Post('webhooks/:provider')
  async handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    return this.integrationService.handleWebhook(provider, payload);
  }
}
