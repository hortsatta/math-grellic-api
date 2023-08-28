import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lesson } from './entities/lesson.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, LessonSchedule])],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
