import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { ExActTextType } from '#/common/enums/content.enum';

export class ExamQuestionChoiceCreateDto {
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
