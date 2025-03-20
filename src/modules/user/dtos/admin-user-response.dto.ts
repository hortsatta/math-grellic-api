import { Expose } from 'class-transformer';

import { UserAccountResponseDto } from './user-account-response.dto';

export class AdminUserResponseDto extends UserAccountResponseDto {
  @Expose()
  aboutMe: string;

  @Expose()
  messengerLink: string;

  @Expose()
  emails: string[];
}
