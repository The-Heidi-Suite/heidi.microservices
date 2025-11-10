import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoreService } from './core.service';
import { JwtAuthGuard } from '@heidi/jwt';

@ApiTags('core')
@Controller()
@UseGuards(JwtAuthGuard)
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
