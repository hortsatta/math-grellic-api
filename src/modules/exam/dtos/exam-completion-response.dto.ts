import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { ExamCompletionQuestionAnswerResponseDto } from './exam-completion-question-answer-response.dto';
import { ExamResponseDto } from './exam-response.dto';

export class ExamCompletionResponseDto extends BaseResponseDto {
  @Expose()
  score: number | null;

  @Expose()
  submittedAt: string;

  @Expose()
  @Type(() => ExamResponseDto)
  exam: ExamResponseDto;

  @Expose()
  @Type(() => ExamCompletionQuestionAnswerResponseDto)
  questionAnswers: ExamCompletionQuestionAnswerResponseDto[];

  @Expose()
  @Type(() => StudentUserResponseDto)
  student: StudentUserResponseDto;
}
