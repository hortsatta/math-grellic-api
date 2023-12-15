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

  @IsInt()
  @IsPositive()
  @IsOptional()
  stageNumber: number;

  @IsString()
  @IsOptional()
  text: string;

  @IsEnum(ExActTextType)
  @IsOptional()
  textType: ExActTextType;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryQuestionChoiceUpdateDto)
  choices: ActivityCategoryQuestionChoiceUpdateDto[];
}
