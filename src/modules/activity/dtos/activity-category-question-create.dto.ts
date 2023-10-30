import { Type } from 'class-transformer';
import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

import { ActivityCategoryQuestionChoiceCreateDto } from './activity-category-question-choice-create.dto';

export class ActivityCategoryQuestionCreateDto {
  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  text: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  activityCategoryId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ActivityCategoryQuestionChoiceCreateDto)
  choices: ActivityCategoryQuestionChoiceCreateDto[];
}
