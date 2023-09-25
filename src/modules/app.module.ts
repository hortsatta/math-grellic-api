import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database.module';
import { CoreModule } from './core/core.module';
import { UserModule } from './user/user.module';
import { LessonModule } from './lesson/lesson.module';
import { ExamModule } from './exam/exam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    DatabaseModule,
    UserModule,
    CoreModule,
    LessonModule,
    ExamModule,
  ],
  controllers: [],
})
export class AppModule {}
