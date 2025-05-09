import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsInt,
  IsPositive,
} from 'class-validator';

export class AnnouncementCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsDateString()
  startDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  studentIds: number[];

  @IsInt()
  @IsPositive()
  @IsOptional()
  schoolYearId: number;
}
