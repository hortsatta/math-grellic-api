import {
  IsInt,
  IsPositive,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class ActivityCategoryQuestionChoiceUpdateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  id: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderNumber: number;

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
