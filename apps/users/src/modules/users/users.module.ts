import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaCoreModule } from '@heidi/prisma';
import { RBACModule } from '@heidi/rbac';

@Module({
  imports: [
    PrismaCoreModule, // For UserCityAssignment operations
    RBACModule, // For PermissionService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
