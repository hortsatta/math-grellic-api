import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { TypeORMError } from 'typeorm';
import { FastifyReply } from 'fastify';

import { capitalize } from '../helpers/capitalize.helper';

@Catch(TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: TypeORMError, host: ArgumentsHost) {
    // Set http status code and custom message base on error code
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    console.log(exception['code']);
    switch (exception['code']) {
      case '22P02':
        {
          httpStatus = HttpStatus.NOT_FOUND;
          message = 'Item not found';
        }
        break;
      case '23505':
        {
          httpStatus = HttpStatus.CONFLICT;
          const table = exception['table'];
          if (table && table.trim()) {
            message = `${capitalize(table)} is already present`;
          }
        }
        break;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    return res.status(httpStatus).send({
      statusCode: httpStatus,
      message,
      error: capitalize(HttpStatus[httpStatus].toLowerCase()),
    });
  }
}
