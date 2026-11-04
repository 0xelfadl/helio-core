import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from '@helio/shared';
import { ApiException } from './api.exception.js';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toErrorResponse(exception);
    const isUnexpected =
      !(exception instanceof HttpException) ||
      status === HttpStatus.INTERNAL_SERVER_ERROR;
      

    if (isUnexpected) {
      this.logger.error(
        'Request failed with an unexpected error',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown): { status: number; body: ApiErrorBody } {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      return {
        status,
        body: {
          error: {
            code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        },
      };
    }

    if (exception instanceof ApiException) {
      return {
        status,
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            ...(exception.details ? { details: exception.details } : {}),
          },
        },
      };
    }

    const httpException = exception as HttpException;
    return {
      status,
      body: {
        error: {
          code: CODE_BY_STATUS[status] ?? 'BAD_REQUEST',
          message: httpException.message,
        },
      },
    };
  }
}