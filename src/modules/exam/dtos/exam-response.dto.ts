import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { RecordStatus } from '#/common/enums/content.enum';
import { LessonResponseDto } from '#/modules/lesson/dtos/lesson-response.dto';
import { ExamQuestionResponseDto } from './exam-question-response.dto';
import { ExamScheduleResponseDto } from './exam-schedule-response.dto';

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
}
