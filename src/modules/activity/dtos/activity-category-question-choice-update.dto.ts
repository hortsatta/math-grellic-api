import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

import { ExActTextType } from '#/common/enums/content.enum';

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

  @IsEnum(ExActTextType)
  @IsOptional()
  textType: ExActTextType;

  @IsBoolean()
  @IsOptional()
  isCorrect: boolean;
}
