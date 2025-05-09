import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class SchoolYearStudentEnrollmentNewStudentCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  studentId: number;
}
