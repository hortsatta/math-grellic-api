import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class SchoolYearEnrollmentCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  userId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  teacherId: number;
}
