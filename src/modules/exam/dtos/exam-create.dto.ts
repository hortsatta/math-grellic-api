import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { RecordStatus } from '#/common/enums/content.enum';
import { ExamQuestionCreateDto } from './exam-question-create.dto';

export class ExamCreateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsBoolean()
  randomizeQuestions: boolean;

  @IsInt()
  @IsPositive()
  visibleQuestionsCount: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  pointsPerQuestion: number;

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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionCreateDto)
  questions: ExamQuestionCreateDto[];

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
