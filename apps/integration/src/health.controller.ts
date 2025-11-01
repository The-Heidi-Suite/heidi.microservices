import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaIntegrationService } from '@heidi/prisma';

@Controller('healthz')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaIntegrationService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => ({ database: { status: (await this.prisma.healthCheck()) ? 'up' : 'down' } }),
    ]);
  }
}
