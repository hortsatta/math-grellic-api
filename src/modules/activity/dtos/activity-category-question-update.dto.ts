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
  IsEnum,
} from 'class-validator';

import { ActivityTextType } from '../enums/activity.enum';
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

  @IsEnum(ActivityTextType)
  @IsOptional()
  textType: ActivityTextType;

  @IsInt()
  @IsPositive()
  @IsOptional()
  stageNumber: number;

  @IsString()
  @IsOptional()
  hintText: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryQuestionChoiceUpdateDto)
  choices: ActivityCategoryQuestionChoiceUpdateDto[];
}
