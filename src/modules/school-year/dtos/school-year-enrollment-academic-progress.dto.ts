import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { SchoolYearAcademicProgress } from '../enums/school-year-enrollment.enum';

export abstract class SchoolYearEnrollmentAcademicProgressDto {
  @IsEnum(SchoolYearAcademicProgress)
  academicProgress: SchoolYearAcademicProgress;

  @IsString()
  @IsOptional()
  academicProgressRemarks: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  schoolYearId: number;
}
