import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryResponseDto } from './activity-category-response.dto';
import { ActivityCategoryQuestionChoiceResponseDto } from './activity-category-question-choice-response.dto';

export class ActivityCategoryQuestionResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  stageNumber: number;

  @Expose()
  @Type(() => ActivityCategoryResponseDto)
  activityCategory: ActivityCategoryResponseDto;

  @Expose()
  @Type(() => ActivityCategoryQuestionChoiceResponseDto)
  choices: ActivityCategoryQuestionChoiceResponseDto[];
}
