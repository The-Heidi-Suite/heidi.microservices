import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaUsersModule, PrismaAuthModule, PrismaCoreModule } from '@heidi/prisma';
import { RBACModule } from '@heidi/rbac';

@Module({
  imports: [
    PrismaUsersModule, // For reading users from users database
    PrismaCoreModule, // For UserCityAssignment and permissions
    PrismaAuthModule, // For sessions and audit logs
    RBACModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
