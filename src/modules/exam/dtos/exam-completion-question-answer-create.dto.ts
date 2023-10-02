import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class ExamCompletionQuestionAnswerCreateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  completionId: number;

  @IsInt()
  @IsPositive()
  questionId: number;

  @IsInt()
  @IsPositive()
  selectedQuestionChoiceId: number;
}
