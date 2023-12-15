import { Expose, Type } from 'class-transformer';

import { ExActTextType } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamQuestionChoiceResponseDto } from '#/modules/exam/dtos/exam-question-choice-response.dto';
import { ExamResponseDto } from '#/modules/exam/dtos/exam-response.dto';

export class ExamQuestionResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ExActTextType;

  @Expose()
  @Type(() => ExamResponseDto)
  exam: ExamResponseDto;

  @Expose()
  @Type(() => ExamQuestionChoiceResponseDto)
  choices: ExamQuestionChoiceResponseDto[];
}
