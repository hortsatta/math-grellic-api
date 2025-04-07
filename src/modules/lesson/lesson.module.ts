import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lesson } from './entities/lesson.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { LessonController } from './lesson.controller';
import { LessonSubscriber } from './subscribers/lesson.subscriber';
import { LessonService } from './services/lesson.service';
import { LessonScheduleService } from './services/lesson-schedule.service';
import { StudentLessonService } from './services/student-lesson.service';
import { TeacherLessonService } from './services/teacher-lesson.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, LessonSchedule, LessonCompletion]),
  ],
  controllers: [LessonController],
  providers: [
    LessonSubscriber,
    LessonService,
    TeacherLessonService,
    StudentLessonService,
    LessonScheduleService,
  ],
  exports: [
    LessonService,
    TeacherLessonService,
    StudentLessonService,
    LessonScheduleService,
  ],
})
export class LessonModule {}
