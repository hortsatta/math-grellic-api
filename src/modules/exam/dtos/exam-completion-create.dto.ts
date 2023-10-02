import { Type } from 'class-transformer';
import {
  IsInt,
  IsDateString,
  IsPositive,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

import { ExamCompletionQuestionAnswerCreateDto } from './exam-completion-question-answer-create.dto';

export class ExamCompletionCreateDto {
  @IsInt()
  score: number;

  @IsDateString()
  submittedAt: Date;

  @IsInt()
  @IsPositive()
  @IsOptional()
  examId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ExamCompletionQuestionAnswerCreateDto)
  questionAnswers: ExamCompletionQuestionAnswerCreateDto[];
}
