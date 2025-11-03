import { DynamicModule, Global, Module, forwardRef } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtTokenService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule, ConfigService } from '@heidi/config';
import { PrismaPermissionsModule } from '@heidi/prisma-permissions';
import { RBACModule } from '@heidi/rbac';

@Global()
@Module({})
export class JwtModule {
  static register(): DynamicModule {
    return {
      module: JwtModule,
      imports: [
        ConfigModule,
        LoggerModule,
        PrismaPermissionsModule,
        forwardRef(() => RBACModule),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        NestJwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.jwtSecret,
            signOptions: {
              expiresIn: configService.jwtExpiresIn,
            },
          }),
        }),
      ],
      providers: [JwtTokenService, JwtStrategy, JwtAuthGuard],
      exports: [JwtTokenService, JwtAuthGuard, PassportModule, NestJwtModule],
    };
  }
}
