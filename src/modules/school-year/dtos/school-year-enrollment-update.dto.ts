import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class SchoolYearEnrollmentUpdateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsString()
  @Length(11)
  @IsOptional()
  teacherId: string;
}
