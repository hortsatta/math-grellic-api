import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryLevel } from '../enums/activity.enum';
import { ActivityResponseDto } from './activity-response.dto';
import { ActivityCategoryQuestionResponseDto } from './activity-category-question-response.dto';
import { ActivityCategoryCompletionResponseDto } from './activity-category-completion-response.dto';
import { ActivityCategoryTypePointResponseDto } from './activity-category-type-point-response.dto';
import { ActivityCategoryTypeTimeResponseDto } from './activity-category-type-time-reponse.dto';
import { ActivityCategoryTypeStageResponseDto } from './activity-category-type-stage-reponse.dto';

export class ActivityCategoryResponseDto extends BaseResponseDto {
  @Expose()
  level: ActivityCategoryLevel;

  @Expose()
  randomizeQuestions: boolean;

  @Expose()
  visibleQuestionsCount: number;

  @Expose()
  @Type(() => ActivityCategoryQuestionResponseDto)
  questions: ActivityCategoryQuestionResponseDto[];

  @Expose()
  @Type(() => ActivityCategoryTypePointResponseDto)
  typePoint: ActivityCategoryTypePointResponseDto;

  @Expose()
  @Type(() => ActivityCategoryTypeTimeResponseDto)
  typeTime: ActivityCategoryTypeTimeResponseDto;

  @Expose()
  @Type(() => ActivityCategoryTypeStageResponseDto)
  typeStage: ActivityCategoryTypeStageResponseDto;

  @Expose()
  @Type(() => ActivityResponseDto)
  activity: ActivityResponseDto;

  @Expose()
  @Type(() => ActivityCategoryCompletionResponseDto)
  completions: ActivityCategoryCompletionResponseDto[];
}
