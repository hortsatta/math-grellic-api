import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class SchoolYearEnrollmentUpdateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  teacherId: number;
}
