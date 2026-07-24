import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Paginated } from './pagination';
import { SKIP_TRANSFORM } from './skip-transform.decorator';

/**
 * Wraps every successful response in the standard envelope (API-CONTRACT.md):
 *   - Paginated<T>  → { data, meta }
 *   - anything else → { data }
 *   - undefined/null (204 responses) → passed through untouched
 *   - handlers marked @SkipTransform() → passed through (e.g. health, file streams)
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((payload: unknown) => {
        if (skip) return payload;
        if (payload === undefined || payload === null) return payload;
        if (payload instanceof Paginated) {
          return { data: payload.data, meta: payload.meta };
        }
        return { data: payload };
      }),
    );
  }
}
