import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { requireSecret } from '../common/config/require-secret.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = requireSecret(config, 'JWT_SECRET');
        return {
          secret,
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: config.getOrThrow<string>('JWT_ISSUER'),
            audience: config.getOrThrow<string>('JWT_AUDIENCE'),
            clockTolerance: 5,
          },
        };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
