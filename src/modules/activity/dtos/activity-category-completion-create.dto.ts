import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';

import { ActivityCategoryCompletionQuestionAnswerUpsertDto } from './activity-category-completion-question-answer-upsert.dto';

export class ActivityCategoryCompletionCreateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityCategoryCompletionQuestionAnswerUpsertDto)
  questionAnswers: ActivityCategoryCompletionQuestionAnswerUpsertDto[];

  @IsNumber()
  @IsOptional()
  timeCompletedSeconds: number;
}
