import { Type } from 'class-transformer';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsEnum,
} from 'class-validator';

import { ExActTextType } from '#/common/enums/content.enum';
import { ExamQuestionChoiceUpdateDto } from './exam-question-choice-update.dto';

export class ExamQuestionUpdateDto {
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

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ExamQuestionChoiceUpdateDto)
  choices: ExamQuestionChoiceUpdateDto[];
}
