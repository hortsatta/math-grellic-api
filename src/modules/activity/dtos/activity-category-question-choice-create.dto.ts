import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

import { ExActTextType } from '#/common/enums/content.enum';

export class ActivityCategoryQuestionChoiceCreateDto {
  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  text: string;

  @IsEnum(ExActTextType)
  textType: ExActTextType;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  questionId: number;
}
