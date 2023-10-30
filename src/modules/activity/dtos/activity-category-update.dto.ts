import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ActivityCategoryLevel } from '../enums/activity.enum';
import { ActivityCategoryQuestionUpdateDto } from './activity-category-question-update.dto';

export class ActivityCategoryUpdateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  id: number;

  @IsEnum(ActivityCategoryLevel)
  @IsOptional()
  level: ActivityCategoryLevel;

  @IsBoolean()
  @IsOptional()
  randomizeQuestions: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  visibleQuestionsCount: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  activityId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryQuestionUpdateDto)
  questions: ActivityCategoryQuestionUpdateDto[];

  // For category type point
  @IsInt()
  @IsOptional()
  correctAnswerCount: number;

  @IsInt()
  @IsOptional()
  pointsPerQuestion: number;

  @IsInt()
  @IsOptional()
  durationSeconds: number;
}
