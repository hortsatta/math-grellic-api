import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { contentParser } from 'fastify-multer';

import { AppModule } from './modules/app.module';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { WebSocketAdapter } from './common/adapters/websocket.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Get config service to access env variables
  const configService = app.get<ConfigService>(ConfigService);
  // Enable cors with options
  app.enableCors({
    origin: JSON.parse(configService.get<string>('CORS_ORIGINS')),
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Accept',
      'Content-Type',
      'Authorization',
    ],
    exposedHeaders: 'Authorization',
    credentials: true,
    methods: ['GET', 'PUT', 'PATCH', 'OPTIONS', 'POST', 'DELETE'],
  });

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
  app.useWebSocketAdapter(new WebSocketAdapter(app));

  await app.register(contentParser);
  await app.listen(configService.get<number>('API_PORT') || 3001, '0.0.0.0');
}
bootstrap();
