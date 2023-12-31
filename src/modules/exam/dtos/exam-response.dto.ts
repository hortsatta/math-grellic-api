import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamScheduleStatus, RecordStatus } from '#/common/enums/content.enum';
import { LessonResponseDto } from '#/modules/lesson/dtos/lesson-response.dto';
import { ExamQuestionResponseDto } from './exam-question-response.dto';
import { ExamScheduleResponseDto } from './exam-schedule-response.dto';
import { ExamCompletionResponseDto } from './exam-completion-response.dto';

export class ExamResponseDto extends BaseResponseDto {
  @Expose()
  status: RecordStatus;

  @Expose()
  orderNumber: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  randomizeQuestions: boolean;

  @Expose()
  visibleQuestionsCount: number;

  @Expose()
  pointsPerQuestion: number;

  @Expose()
  passingPoints: number;

  @Expose()
  description: string;

  @Expose()
  excerpt: string;

  @Expose()
  @Type(() => LessonResponseDto)
  coveredLessons: LessonResponseDto[];

  @Expose()
  @Type(() => ExamQuestionResponseDto)
  questions: ExamQuestionResponseDto[];

  @Expose()
  @Type(() => ExamScheduleResponseDto)
  schedules: ExamScheduleResponseDto[];

  @Expose()
  scheduleStatus: ExamScheduleStatus;

  @Expose()
  @Type(() => ExamCompletionResponseDto)
  completions: ExamCompletionResponseDto[];

  @Expose()
  rank: number | null;
}
