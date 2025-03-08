import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database.module';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { LessonModule } from './lesson/lesson.module';
import { ExamModule } from './exam/exam.module';
import { ActivityModule } from './activity/activity.module';
import { PerformanceModule } from './performance/performance.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UploadModule } from './upload/upload.module';
import { AnnouncementModule } from './announcement/announcement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    CoreModule,
    LessonModule,
    ExamModule,
    ActivityModule,
    PerformanceModule,
    ScheduleModule,
    AnnouncementModule,
    UploadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
