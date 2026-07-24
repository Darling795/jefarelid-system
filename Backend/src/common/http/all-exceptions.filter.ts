import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { ApiCode } from './api-codes';

/**
 * Serializes every error into the API error envelope:
 *   { error: { code, message, details? } }
 * `code` is a stable string; the frontend switches on it, never on `message`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ApiCode.INTERNAL;
    let message = 'An unexpected error occurred.';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'code' in body) {
        // AppException — already shaped.
        const b = body as { code: string; message: string; details?: Record<string, unknown> };
        code = b.code;
        message = b.message;
        details = b.details;
      } else {
        // Framework exception (ValidationPipe, guards, 404, etc.).
        const b = body as { message?: string | string[]; error?: string };
        if (status === HttpStatus.BAD_REQUEST && Array.isArray(b?.message)) {
          code = ApiCode.VALIDATION_ERROR;
          message = 'Validation failed.';
          details = { errors: b.message };
        } else {
          code = statusToCode(status);
          message =
            (Array.isArray(b?.message) ? b.message.join(', ') : b?.message) ??
            exception.message;
        }
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ error: { code, message, details } });
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ApiCode.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ApiCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ApiCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ApiCode.CONFLICT;
    case HttpStatus.BAD_REQUEST:
      return ApiCode.VALIDATION_ERROR;
    default:
      return ApiCode.INTERNAL;
  }
}
