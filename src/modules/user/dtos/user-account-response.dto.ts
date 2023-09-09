import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { UserGender } from '../enums/user.enum';
import { UserResponseDto } from './user-response.dto';

export abstract class UserAccountResponseDto extends BaseResponseDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  middleName: string;

  @Expose()
  birthDate: Date;

  @Expose()
  phoneNumber: string;

  @Expose()
  gender: UserGender;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
