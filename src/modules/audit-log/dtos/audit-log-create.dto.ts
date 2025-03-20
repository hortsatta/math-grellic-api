import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AuditFeatureType } from '../enums/audit-log.enum';

export class AuditLogCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actionName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  actionValue?: string;

  @IsInt()
  @IsPositive()
  featureId: number;

  @IsEnum(AuditFeatureType)
  @IsOptional()
  featureType: AuditFeatureType;
}
