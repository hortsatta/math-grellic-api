import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { ExamCompletionQuestionAnswerResponseDto } from './exam-completion-question-answer-response.dto';
import { ExamResponseDto } from './exam-response.dto';
import { ExamScheduleResponseDto } from './exam-schedule-response.dto';

export class ExamCompletionResponseDto extends BaseResponseDto {
  @Expose()
  score: number | null;

  @Expose()
  submittedAt: string;

  @Expose()
  @Type(() => ExamResponseDto)
  exam: ExamResponseDto;

  @Expose()
  @Type(() => ExamScheduleResponseDto)
  schedule: ExamScheduleResponseDto;

  @Expose()
  @Type(() => ExamCompletionQuestionAnswerResponseDto)
  questionAnswers: ExamCompletionQuestionAnswerResponseDto[];

  @Expose()
  @Type(() => StudentUserResponseDto)
  student: StudentUserResponseDto;

  @Expose()
  isHighest: boolean | null;

  @Expose()
  isRecent: boolean | null;
}
