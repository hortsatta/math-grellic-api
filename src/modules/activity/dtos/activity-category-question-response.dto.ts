import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityTextType } from '../enums/activity.enum';
import { ActivityCategoryResponseDto } from './activity-category-response.dto';
import { ActivityCategoryQuestionChoiceResponseDto } from './activity-category-question-choice-response.dto';

export class ActivityCategoryQuestionResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ActivityTextType;

  @Expose()
  stageNumber: number;

  @Expose()
  hintText: string;

  @Expose()
  @Type(() => ActivityCategoryResponseDto)
  activityCategory: ActivityCategoryResponseDto;

  @Expose()
  @Type(() => ActivityCategoryQuestionChoiceResponseDto)
  choices: ActivityCategoryQuestionChoiceResponseDto[];
}
