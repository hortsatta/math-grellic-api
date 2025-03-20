import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DatabaseModule } from './database.module';
import { MailerModule } from './mailer/mailer.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CoreModule } from './core/core.module';
import { LessonModule } from './lesson/lesson.module';
import { ExamModule } from './exam/exam.module';
import { ActivityModule } from './activity/activity.module';
import { PerformanceModule } from './performance/performance.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { UploadModule } from './upload/upload.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    DatabaseModule,
    MailerModule,
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
    AuditLogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
