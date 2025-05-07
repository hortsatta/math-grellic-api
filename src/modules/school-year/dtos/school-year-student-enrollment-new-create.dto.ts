import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { StudentUserCreateDto } from '#/modules/user/dtos/student-user-create.dto';
import { SchoolYearStudentEnrollmentNewStudentCreateDto } from './school-year-student-enrollment-new-student-create.dto';

export class SchoolYearStudentEnrollmentNewCreateDto {
  @ValidateNested()
  @Type(() => StudentUserCreateDto)
  studentUser: StudentUserCreateDto;

  @ValidateNested()
  @Type(() => SchoolYearStudentEnrollmentNewStudentCreateDto)
  studentEnrollment: SchoolYearStudentEnrollmentNewStudentCreateDto;
}
