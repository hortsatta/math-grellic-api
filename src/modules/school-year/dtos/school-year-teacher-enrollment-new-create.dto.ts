import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { TeacherUserCreateDto } from '#/modules/user/dtos/teacher-user-create.dto';
import { SchoolYearTeacherEnrollmentNewTeacherCreateDto } from './school-year-teacher-enrollment-new-teacher-create.dto';

export class SchoolYearTeacherEnrollmentNewCreateDto {
  @ValidateNested()
  @Type(() => TeacherUserCreateDto)
  teacherUser: TeacherUserCreateDto;

  @ValidateNested()
  @Type(() => SchoolYearTeacherEnrollmentNewTeacherCreateDto)
  teacherEnrollment: SchoolYearTeacherEnrollmentNewTeacherCreateDto;
}
