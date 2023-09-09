import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable, map } from 'rxjs';

export function UseFilterFieldsInterceptor(isPagination?: boolean) {
  return UseInterceptors(new FilterFieldsInterceptor(isPagination));
}

class FilterFieldsInterceptor implements NestInterceptor {
  constructor(private isPagination: boolean) {}

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      map((data: any) => {
        if (data) {
          const req = context.switchToHttp().getRequest<FastifyRequest>();
          const { exclude, include } = req.query as any;
          const excludeFields = exclude?.split(',');
          const includeFields = include?.split(',');

          // Set target data to be filtered based on isPagination
          const targetData = this.isPagination ? data[0] : data;

          if (excludeFields?.length) {
            const filteredData = Array.isArray(targetData)
              ? targetData.map((item) => this.filter(item, excludeFields, true))
              : this.filter(targetData, excludeFields, true);

            return filteredData;
          }

          if (includeFields?.length) {
            const filteredData = Array.isArray(targetData)
              ? targetData.map((item) =>
                  this.filter(item, includeFields, false),
                )
              : this.filter(targetData, includeFields, false);

            return filteredData;
          }
        }

        return data;
      }),
    );
  }

  filter(item, fields, isExclude) {
    return Object.keys(item)
      .filter((key) =>
        isExclude ? !fields.includes(key) : fields.includes(key),
      )
      .reduce((obj, key) => {
        return {
          ...obj,
          [key]: item[key],
        };
      }, {});
  }
}
