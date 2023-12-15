import { Expose, Type } from 'class-transformer';

import { ExActTextType } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryQuestionResponseDto } from './activity-category-question-response.dto';

export class ActivityCategoryQuestionChoiceResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ExActTextType;

  @Expose()
  isCorrect: boolean;

  @Expose()
  @Type(() => ActivityCategoryQuestionResponseDto)
  question: ActivityCategoryQuestionResponseDto;
}
