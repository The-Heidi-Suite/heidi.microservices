import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaPermissionsModule } from '@heidi/prisma-permissions';
import { RBACModule } from '@heidi/rbac';

@Module({
  imports: [PrismaPermissionsModule, RBACModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
