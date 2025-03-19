import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityTextType } from '../enums/activity.enum';
import { ActivityCategoryQuestionResponseDto } from './activity-category-question-response.dto';

export class ActivityCategoryQuestionChoiceResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ActivityTextType;

  @Expose()
  isCorrect: boolean;

  @Expose()
  @Type(() => ActivityCategoryQuestionResponseDto)
  question: ActivityCategoryQuestionResponseDto;
}
