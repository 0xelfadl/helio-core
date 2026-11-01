import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './auth.types.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { extractBearerToken, toPrincipal } from './token-claims.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw this.reject('missing or malformed Authorization header');

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'unknown error';
      throw this.reject(`token verification failed (${reason})`);
    }

    const principal = toPrincipal(payload);
    if (!principal) throw this.reject('token claims are invalid');

    request.principal = principal;
    return true;
  }

  private reject(reason: string): UnauthorizedException {
    this.logger.warn(`Unauthenticated request rejected: ${reason}`);
    return new UnauthorizedException('Missing or invalid token');
  }
}