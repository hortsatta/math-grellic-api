import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { ExamModule } from '../exam/exam.module';
import { LessonModule } from '../lesson/lesson.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { MeetingSchedule } from './entities/meeting-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingSchedule]),
    UserModule,
    LessonModule,
    forwardRef(() => ExamModule),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
