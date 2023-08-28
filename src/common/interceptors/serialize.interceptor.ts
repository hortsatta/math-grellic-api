import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable, map } from 'rxjs';

interface ClassConstructor {
  // Accept any class
  new (...args: any[]): unknown;
}

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor) {}

  intercept(_: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      // Convert object to instance before sending to client
      map((data: any) =>
        plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}
