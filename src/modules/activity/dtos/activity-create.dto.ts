import {
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { ActivityGame } from '../enums/activity.enum';
import { ActivityCategoryCreateDto } from './activity-category-create.dto';

export class ActivityCreateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsEnum(ActivityGame)
  game: ActivityGame;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  excerpt: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityCategoryCreateDto)
  categories: ActivityCategoryCreateDto[];
}
