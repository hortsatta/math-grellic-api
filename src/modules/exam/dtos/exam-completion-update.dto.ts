import { Type } from 'class-transformer';
import {
  IsInt,
  IsDateString,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { ExamCompletionQuestionAnswerUpsertDto } from './exam-completion-question-answer-update.dto';

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
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ExamCompletionQuestionAnswerUpsertDto)
  questionAnswers: ExamCompletionQuestionAnswerUpsertDto[];
}
