import { Type } from 'class-transformer';
import { IsArray, IsInt, IsPositive, ValidateNested } from 'class-validator';

import { ExamCompletionQuestionAnswerUpsertDto } from './exam-completion-question-answer-update.dto';

export class ExamCompletionCreateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamCompletionQuestionAnswerUpsertDto)
  questionAnswers: ExamCompletionQuestionAnswerUpsertDto[];

  @IsInt()
  @IsPositive()
  scheduleId: number;
}
