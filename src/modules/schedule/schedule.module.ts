import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { ExamModule } from '../exam/exam.module';
import { LessonModule } from '../lesson/lesson.module';
import { ScheduleController } from './schedule.controller';
import { MeetingSchedule } from './entities/meeting-schedule.entity';
import { ScheduleService } from './schedules/schedule.service';
import { TeacherScheduleService } from './schedules/teacher-schedule.service';
import { StudentScheduleService } from './schedules/student-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingSchedule]),
    UserModule,
    LessonModule,
    forwardRef(() => ExamModule),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, TeacherScheduleService, StudentScheduleService],
  exports: [ScheduleService, TeacherScheduleService],
})
export class ScheduleModule {}
