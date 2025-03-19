import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

import { ActivityTextType } from '../enums/activity.enum';

export class ActivityCategoryQuestionChoiceUpdateDto {
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

  @IsBoolean()
  @IsOptional()
  isCorrect: boolean;
}
