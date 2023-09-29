import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class ExamQuestionChoiceUpdateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  id: number;

  @IsString()
  @IsOptional()
  text: string;

  @IsBoolean()
  @IsOptional()
  isCorrect: boolean;

  @IsBoolean()
  @IsOptional()
  isExpression: boolean;
}
