import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { LessonModule } from '../lesson/lesson.module';
import { Exam } from './entities/exam.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ExamQuestionChoice } from './entities/exam-question-choice.entity';
import { ExamSchedule } from './entities/exam-schedule.entity';
import { ExamCompletion } from './entities/exam-completion.entity';
import { ExamCompletionQuestionAnswer } from './entities/exam-completion-question-answer.entity';
import { ExamController } from './exam.controller';
import { ExamSubscriber } from './subscribers/exam.subscriber';
import { ExamGateway } from './exam.gateway';
import { ExamService } from './exam.service';
import { ExamScheduleService } from './exam-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamQuestion,
      ExamQuestionChoice,
      ExamSchedule,
      ExamCompletion,
      ExamCompletionQuestionAnswer,
    ]),
    UserModule,
    LessonModule,
    forwardRef(() => ScheduleModule),
  ],
  controllers: [ExamController],
  providers: [ExamGateway, ExamSubscriber, ExamService, ExamScheduleService],
  exports: [ExamService, ExamScheduleService],
})
export class ExamModule {}
