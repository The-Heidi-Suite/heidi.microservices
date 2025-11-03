import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaAuthModule } from '@heidi/prisma';
import { RBACModule } from '@heidi/rbac';
import { SagaModule } from '@heidi/saga';

@Module({
  imports: [
    PrismaAuthModule, // For sessions and audit logs (own database)
    RBACModule,
    SagaModule, // Saga orchestrator for distributed transactions
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
