import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ExamQuestionChoiceCreateDto {
  @IsInt()
  @IsPositive()
  orderNumber: number;

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
