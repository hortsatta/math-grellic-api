import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class ActivityCategoryQuestionChoiceCreateDto {
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
