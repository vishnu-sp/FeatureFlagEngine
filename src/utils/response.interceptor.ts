import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { buildSuccessResponse } from './response.util';
import { ApiResponse } from './response.util';

/**
 * Wraps all successful responses in the standard ApiResponse format.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const statusCode = response?.statusCode ?? 200;

    return next
      .handle()
      .pipe(map((data: T) => buildSuccessResponse(data, statusCode)));
  }
}
