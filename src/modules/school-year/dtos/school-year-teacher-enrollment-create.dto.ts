import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class SchoolYearTeacherEnrollmentCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  teacherId: number;
}
