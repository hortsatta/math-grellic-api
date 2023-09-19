import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { LessonSubscriber } from './subscribers/lesson.subscriber';
import { Lesson } from './entities/lesson.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { LessonScheduleService } from './lesson-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, LessonSchedule, LessonCompletion]),
    UserModule,
  ],
  controllers: [LessonController],
  providers: [LessonSubscriber, LessonService, LessonScheduleService],
})
export class LessonModule {}
