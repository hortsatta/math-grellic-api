import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class SchoolYearTeacherEnrollmentNewTeacherCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  teacherId: number;
}
