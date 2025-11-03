import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RBACModule } from '@heidi/rbac';
import { SagaModule } from '@heidi/saga';

@Module({
  imports: [
    RBACModule, // For PermissionService
    SagaModule, // Saga orchestrator for distributed transactions
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
