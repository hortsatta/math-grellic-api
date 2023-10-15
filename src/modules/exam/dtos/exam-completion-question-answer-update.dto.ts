import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class ExamCompletionQuestionAnswerUpsertDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  completionId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  questionId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  selectedQuestionChoiceId: number;
}
