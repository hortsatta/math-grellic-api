import { Expose, Type } from 'class-transformer';

import { ExActTextType } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryResponseDto } from './activity-category-response.dto';
import { ActivityCategoryQuestionChoiceResponseDto } from './activity-category-question-choice-response.dto';

export class ActivityCategoryQuestionResponseDto extends BaseResponseDto {
  @Expose()
  orderNumber: number;

  @Expose()
  text: string;

  @Expose()
  textType: ExActTextType;

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
