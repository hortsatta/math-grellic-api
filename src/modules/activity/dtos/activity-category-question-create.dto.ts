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

import { ExActTextType } from '#/common/enums/content.enum';
import { ActivityCategoryQuestionChoiceCreateDto } from './activity-category-question-choice-create.dto';

export class ActivityCategoryQuestionCreateDto {
  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  text: string;

  @IsEnum(ExActTextType)
  textType: ExActTextType;

  @IsInt()
  @IsPositive()
  @IsOptional()
  stageNumber: number;

  @IsString()
  @IsOptional()
  hintText: string;

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
