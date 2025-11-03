import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersMessageController } from './users-message.controller';
import { UsersService } from './users.service';
import { RBACModule } from '@heidi/rbac';
import { SagaModule } from '@heidi/saga';
import { LoggerModule } from '@heidi/logger';

@Module({
  imports: [
    RBACModule, // For PermissionService
    SagaModule, // Saga orchestrator for distributed transactions
    LoggerModule, // For message controller logging
  ],
  controllers: [UsersController, UsersMessageController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
