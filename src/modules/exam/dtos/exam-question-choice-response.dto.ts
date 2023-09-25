import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamQuestionResponseDto } from '#/modules/exam/dtos/exam-question-response.dto';

export class ExamQuestionChoiceResponseDto extends BaseResponseDto {
  @Expose()
  text: string;

  @Expose()
  isCorrect: boolean;

  @Expose()
  @Type(() => ExamQuestionResponseDto)
  question: ExamQuestionResponseDto;
}
