import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { ExamResponseDto } from './exam-response.dto';

export class ExamCompletionResponseDto extends BaseResponseDto {
  @Expose()
  score: number;

  @Expose()
  submittedAt: string;

  @Expose()
  @Type(() => ExamResponseDto)
  exam: ExamResponseDto;

  @Expose()
  @Type(() => StudentUserResponseDto)
  student: StudentUserResponseDto;
}

// @OneToMany(
//   () => ExamCompletionQuestionAnswer,
//   (examCompletionQuestionAnswer) => examCompletionQuestionAnswer.completion,
//   { cascade: true },
// )
// questionAnswers: ExamCompletionQuestionAnswer[];
