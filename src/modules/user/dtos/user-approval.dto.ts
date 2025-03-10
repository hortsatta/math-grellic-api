import { IsEnum, IsOptional, IsString } from 'class-validator';

import { UserApprovalStatus } from '../enums/user.enum';

export abstract class UserApprovalDto {
  @IsEnum(UserApprovalStatus)
  approvalStatus: UserApprovalStatus;

  @IsString()
  @IsOptional()
  approvalRejectReason: string;
}
