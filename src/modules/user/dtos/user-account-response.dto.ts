import { Expose } from 'class-transformer';
import { UserGender } from '../enums/user.enum';

export abstract class UserAccountResponseDto {
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
