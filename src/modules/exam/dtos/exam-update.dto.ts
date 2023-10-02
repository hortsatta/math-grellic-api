import {
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { ExamQuestionUpdateDto } from './exam-question-update.dto';

export class ExamUpdateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title: string;

  @IsBoolean()
  @IsOptional()
  randomizeQuestions: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  visibleQuestionsCount: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  pointsPerQuestion: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  passingPoints: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  excerpt: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  coveredLessonIds: number[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ExamQuestionUpdateDto)
  questions: ExamQuestionUpdateDto[];

  // TODO separate scheduling or retain step like lesson?
  @IsDateString()
  @IsOptional()
  startDate: Date;

  @IsDateString()
  @IsOptional()
  endDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  studentIds: number[];
}
