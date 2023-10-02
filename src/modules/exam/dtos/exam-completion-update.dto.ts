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

import { ExamCompletionQuestionAnswerUpdateDto } from './exam-completion-question-answer-update.dto';

export class ExamCompletionUpdateDto {
  @IsInt()
  @IsOptional()
  score: number;

  @IsDateString()
  @IsOptional()
  submittedAt: Date;

  @IsInt()
  @IsPositive()
  @IsOptional()
  examId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ExamCompletionQuestionAnswerUpdateDto)
  questionAnswers: ExamCompletionQuestionAnswerUpdateDto[];
}
