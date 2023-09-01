import { IsOptional, IsString, Length } from 'class-validator';
import { UserCreateDto } from './user-create.dto';

export class StudentUserCreateDto extends UserCreateDto {
  @IsString()
  @Length(11)
  teacherId: string;

  @IsString()
  @IsOptional()
  aboutMe: string;
}
