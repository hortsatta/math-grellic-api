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

import { ActivityCategoryQuestionChoiceUpdateDto } from './activity-category-question-choice-update.dto';

export class ActivityCategoryQuestionUpdateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  id: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderNumber: number;

  @IsString()
  @IsOptional()
  text: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryQuestionChoiceUpdateDto)
  choices: ActivityCategoryQuestionChoiceUpdateDto[];
}
