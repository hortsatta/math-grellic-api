import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { Lesson } from './lesson/entities/lesson.entity';
import { LessonSchedule } from './lesson/entities/lesson-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        // Use snake_case for databse column names
        namingStrategy: new SnakeNamingStrategy(),
        entities: [Lesson, LessonSchedule],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
