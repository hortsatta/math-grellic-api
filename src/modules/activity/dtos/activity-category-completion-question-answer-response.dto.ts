import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryCompletionResponseDto } from './activity-category-completion-response.dto';
import { ActivityCategoryQuestionChoiceResponseDto } from './activity-category-question-choice-response.dto';
import { ActivityCategoryQuestionResponseDto } from './activity-category-question-response.dto';

export class ActivityCategoryCompletionQuestionAnswerResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ActivityCategoryCompletionResponseDto)
  completion: ActivityCategoryCompletionResponseDto;

  @Expose()
  @Type(() => ActivityCategoryQuestionResponseDto)
  question: ActivityCategoryQuestionResponseDto;

  @Expose()
  @Type(() => ActivityCategoryQuestionChoiceResponseDto)
  selectedQuestionChoice: ActivityCategoryQuestionChoiceResponseDto;
}
