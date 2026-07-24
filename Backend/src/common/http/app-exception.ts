import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiCodeValue } from './api-codes';

/**
 * Business/domain exception carrying a stable `code`. The global exception
 * filter serializes it into the API error envelope:
 *   { error: { code, message, details } }
 */
export class AppException extends HttpException {
  constructor(
    code: ApiCodeValue,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
