import {
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';

export class MeetingScheduleCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsUrl()
  @MaxLength(255)
  meetingUrl: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

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
