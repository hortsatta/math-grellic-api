import { Expose, Type } from 'class-transformer';

import { ExActTextType } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamQuestionResponseDto } from '#/modules/exam/dtos/exam-question-response.dto';

export class ExamQuestionChoiceResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ExActTextType;

  @Expose()
  isCorrect: boolean;

  @Expose()
  @Type(() => ExamQuestionResponseDto)
  question: ExamQuestionResponseDto;
}
