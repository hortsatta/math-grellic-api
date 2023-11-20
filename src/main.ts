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

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Get config service to access env variables
  const configService = app.get<ConfigService>(ConfigService);
  // Enable and assign origins
  app.enableCors({
    origin: JSON.parse(configService.get<string>('CORS_ORIGINS')),
    credentials: true,
  });
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

  await app.listen(3001);
}
bootstrap();
