import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxDate,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import dayjs from '#/common/configs/dayjs.config';
import { UserApprovalStatus, UserGender } from '../enums/user.enum';

export abstract class UserUpdateDto {
  // @IsEmail()
  // @MaxLength(255)
  // @IsOptional()
  // email: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  profileImageUrl: string;

  @IsEnum(UserApprovalStatus)
  @IsOptional()
  approvalStatus: UserApprovalStatus;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  firstName: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  lastName: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  middleName: string;

  @Type(() => Date)
  @IsDate()
  @MaxDate(dayjs().toDate())
  @IsOptional()
  birthDate: Date;

  @IsPhoneNumber('PH')
  @MaxLength(11)
  @IsOptional()
  phoneNumber: string;

  @IsEnum(UserGender)
  @IsOptional()
  gender: UserGender;
}
