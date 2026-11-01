import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { JwtAuthGuard } from './jwt-auth.guard.js';

const MIN_SECRET_BYTES = 32;

@Module({
    imports: [
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService): JwtModuleOptions => {
             const secret = config.getOrThrow<string>('JWT_SECRET');
             if (Buffer.byteLength(secret, 'utf-8') < MIN_SECRET_BYTES) {
                throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes`)
             }
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
export class AuthModule{}