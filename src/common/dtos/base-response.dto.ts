import { Expose } from 'class-transformer';

export abstract class BaseResponseDto {
  @Expose()
  id: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;
}
