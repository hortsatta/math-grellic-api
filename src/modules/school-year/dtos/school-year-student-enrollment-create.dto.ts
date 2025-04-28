import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class SchoolYearStudentEnrollmentCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsString()
  @Length(11)
  teacherId: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  studentId: number;
}
