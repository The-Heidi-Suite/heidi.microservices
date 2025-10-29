import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtTokenService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({})
export class JwtModule {
  static register(): DynamicModule {
    return {
      module: JwtModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        NestJwtModule.register({
          secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
          signOptions: {
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          },
        }),
      ],
      providers: [JwtTokenService, JwtStrategy, JwtAuthGuard],
      exports: [JwtTokenService, JwtAuthGuard, PassportModule, NestJwtModule],
    };
  }
}
