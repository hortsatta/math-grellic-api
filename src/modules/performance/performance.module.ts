import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentUserAccount } from '../user/entities/student-user-account.entity';
import { UserModule } from '../user/user.module';
import { SchoolYearModule } from '../school-year/school-year.module';
import { LessonModule } from '../lesson/lesson.module';
import { ExamModule } from '../exam/exam.module';
import { ActivityModule } from '../activity/activity.module';
import { PerformanceService } from './services/performance.service';
import { PerformanceController } from './performance.controller';
import { TeacherPerformanceService } from './services/teacher-performance.service';
import { StudentPerformanceService } from './services/student.performance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentUserAccount]),
    UserModule,
    SchoolYearModule,
    LessonModule,
    ExamModule,
    ActivityModule,
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    TeacherPerformanceService,
    StudentPerformanceService,
  ],
})
export class PerformanceModule {}
