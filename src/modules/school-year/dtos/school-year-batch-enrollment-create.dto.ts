import {
  IsInt,
  IsPositive,
  IsOptional,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';

export class SchoolYearBatchEnrollmentCreateDto {
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  userAccountIds: number[];
}
