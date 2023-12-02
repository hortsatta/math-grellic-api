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
import { ActivityCategoryQuestionCreateDto } from './activity-category-question-create.dto';

export class ActivityCategoryCreateDto {
  @IsEnum(ActivityCategoryLevel)
  level: ActivityCategoryLevel;

  @IsBoolean()
  randomizeQuestions: boolean;

  @IsInt()
  @IsPositive()
  visibleQuestionsCount: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  activityId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityCategoryQuestionCreateDto)
  questions: ActivityCategoryQuestionCreateDto[];

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

  @IsInt()
  @IsOptional()
  totalStageCount: number;
}
