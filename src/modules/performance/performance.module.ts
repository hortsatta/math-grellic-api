import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentUserAccount } from '../user/entities/student-user-account.entity';
import { UserModule } from '../user/user.module';
import { LessonModule } from '../lesson/lesson.module';
import { ExamModule } from '../exam/exam.module';
import { ActivityModule } from '../activity/activity.module';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentUserAccount]),
    UserModule,
    LessonModule,
    ExamModule,
    ActivityModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
})
export class PerformanceModule {}
