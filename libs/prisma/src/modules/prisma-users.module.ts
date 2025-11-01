import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaUsersService } from '../services/prisma-users.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaUsersService],
  exports: [PrismaUsersService],
})
export class PrismaUsersModule {}
