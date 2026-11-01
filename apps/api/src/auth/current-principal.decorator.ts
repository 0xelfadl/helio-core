
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPrincipal, AuthenticatedRequest} from './auth.types.js';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if(!request.principal){
        throw new Error('@CurrentPrincipal() used a route without authentication');
    }
    return request.principal;
  },
);
