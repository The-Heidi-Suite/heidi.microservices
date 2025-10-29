import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('integrations')
  async findAll() {
    return this.integrationService.findAll();
  }

  @Post('webhooks/:provider')
  async handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    return this.integrationService.handleWebhook(provider, payload);
  }
}
