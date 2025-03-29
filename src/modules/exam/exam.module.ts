import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UploadModule } from '../upload/upload.module';
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
import { TeacherExamService } from './services/teacher-exam.service';
import { StudentExamService } from './services/student-exam.service';
import { StudentExamScheduleService } from './services/student-exam-schedule.service';
import { TeacherExamScheduleService } from './services/teacher-exam-schedule.service';

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
    UploadModule,
    UserModule,
    LessonModule,
    forwardRef(() => ScheduleModule),
  ],
  controllers: [ExamController],
  providers: [
    ExamGateway,
    ExamSubscriber,
    TeacherExamService,
    StudentExamService,
    TeacherExamScheduleService,
    StudentExamScheduleService,
  ],
  exports: [
    TeacherExamService,
    StudentExamService,
    TeacherExamScheduleService,
    StudentExamScheduleService,
  ],
})
export class ExamModule {}
