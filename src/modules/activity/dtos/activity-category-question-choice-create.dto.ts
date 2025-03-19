import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

import { ActivityTextType } from '../enums/activity.enum';

export class ActivityCategoryQuestionChoiceCreateDto {
  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  text: string;

  @IsEnum(ActivityTextType)
  textType: ActivityTextType;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  questionId: number;
}
