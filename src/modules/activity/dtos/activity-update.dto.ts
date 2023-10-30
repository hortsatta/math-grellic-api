import {
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { ActivityGame } from '../enums/activity.enum';
import { ActivityCategoryUpdateDto } from './activity-category-update.dto';

export class ActivityUpdateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title: string;

  @IsEnum(ActivityGame)
  @IsOptional()
  game: ActivityGame;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  excerpt: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ActivityCategoryUpdateDto)
  categories: ActivityCategoryUpdateDto[];
}
