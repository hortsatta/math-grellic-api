import { IsEnum, IsOptional, IsString } from 'class-validator';

import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';

export abstract class SchoolYearEnrollmentApprovalDto {
  @IsEnum(SchoolYearEnrollmentApprovalStatus)
  approvalStatus: SchoolYearEnrollmentApprovalStatus;

  @IsString()
  @IsOptional()
  approvalRejectedReason: string;
}
