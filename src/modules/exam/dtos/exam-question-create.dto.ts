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
import { ExamQuestionChoiceCreateDto } from './exam-question-choice-create.dto';

export class ExamQuestionCreateDto {
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
  examId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionChoiceCreateDto)
  choices: ExamQuestionChoiceCreateDto[];
}
