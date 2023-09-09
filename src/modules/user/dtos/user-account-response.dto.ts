import { Expose } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { UserGender } from '../enums/user.enum';

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
}
