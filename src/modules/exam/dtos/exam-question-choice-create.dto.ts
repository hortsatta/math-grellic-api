import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ExamQuestionChoiceCreateDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsBoolean()
  isExpression: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  questionId: number;
}
