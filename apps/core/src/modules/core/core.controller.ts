import { Controller, Get, Post, Body } from '@nestjs/common';
import { CoreService } from './core.service';

@Controller()
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Get('status')
  getStatus() {
    return this.coreService.getStatus();
  }

  @Post('operations')
  executeOperation(@Body() payload: any) {
    return this.coreService.executeOperation(payload);
  }
}
