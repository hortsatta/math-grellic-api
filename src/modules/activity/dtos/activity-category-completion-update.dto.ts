import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  IsPositive,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { ActivityCategoryCompletionQuestionAnswerUpsertDto } from './activity-category-completion-question-answer-upsert.dto';

export class ActivityCategoryCompletionUpdateDto {
  @IsInt()
  @IsOptional()
  score: number;

  @IsNumber()
  @IsOptional()
  timeCompletedSeconds: number;

  @IsDateString()
  @IsOptional()
  submittedAt: Date;

  @IsInt()
  @IsPositive()
  @IsOptional()
  activityCategoryId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryCompletionQuestionAnswerUpsertDto)
  questionAnswers: ActivityCategoryCompletionQuestionAnswerUpsertDto[];
}
