import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { User } from './user/entities/user.entity';
import { TeacherUserAccount } from './user/entities/teacher-user-account.entity';
import { StudentUserAccount } from './user/entities/student-user-account.entity';
import { Lesson } from './lesson/entities/lesson.entity';
import { LessonSchedule } from './lesson/entities/lesson-schedule.entity';
import { LessonCompletion } from './lesson/entities/lesson-completion.entity';

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
        entities: [
          User,
          TeacherUserAccount,
          StudentUserAccount,
          Lesson,
          LessonSchedule,
          LessonCompletion,
        ],
        synchronize: process.env.NODE_ENV !== 'production',
        ssl: process.env.NODE_ENV === 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
