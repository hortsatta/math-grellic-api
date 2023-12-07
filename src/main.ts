import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './modules/app.module';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { AuthSocketAdapter } from './common/adapters/auth-socket.adapter';

dotenv.config();

async function bootstrap() {
  const adapter = new FastifyAdapter();
  // Enable cors with options
  adapter.enableCors({
    origin: JSON.parse(process.env.CORS_ORIGINS),
    allowedHeaders: [
      'Access-Control-Allow-Origin',
      'Origin',
      'X-Requested-With',
      'Accept',
      'Content-Type',
      'Authorization',
    ],
    exposedHeaders: 'Authorization',
    credentials: true,
    methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE'],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // Get config service to access env variables
  const configService = app.get<ConfigService>(ConfigService);

  // Append api prefix to your base url
  app.setGlobalPrefix('api');
  // Enable versioning on this api
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // Enable body validation
  app.useGlobalPipes(
    new ValidationPipe({
      // Remove and return error if unwanted properties exists
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      // Automatically transform payloads to be objects typed according to their DTO classes
      transform: true,
    }),
  );
  // Catch database specific errors/exception
  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.useWebSocketAdapter(new AuthSocketAdapter(app));

  await app.listen(configService.get<number>('API_PORT') || 3001, '0.0.0.0');
}
bootstrap();
