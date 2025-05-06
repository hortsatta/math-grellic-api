import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UserRole } from '#/modules/user/enums/user.enum';
import { CurrentUser } from '../../user/decorators/current-user.decorator';
import { UseJwtAuthGuard } from '../../auth/auth.guard';
import { User } from '../../user/entities/user.entity';
import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearEnrollmentResponseDto } from '../dtos/school-year-enrollment-response.dto';
import { SchoolYearTeacherEnrollmentCreateDto } from '../dtos/school-year-teacher-enrollment-create.dto';
import { SchoolYearStudentEnrollmentCreateDto } from '../dtos/school-year-student-enrollment-create.dto';
import { SchoolYearBatchEnrollmentCreateDto } from '../dtos/school-year-batch-enrollment-create.dto';
import { SchoolYearEnrollmentService } from '../services/school-year-enrollment.service';

const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('sy-enrollments')
export class SchoolYearEnrollmentController {
  constructor(
    private readonly schoolYearEnrollmentService: SchoolYearEnrollmentService,
  ) {}

  @Get('/me')
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(SchoolYearEnrollmentResponseDto)
  me(
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
  ): Promise<SchoolYearEnrollment> {
    return this.schoolYearEnrollmentService.getOneByUserIdAndSchoolYearId(
      user.id,
      schoolYearId == null || isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  // Self service enrollment
  @Post(`${TEACHER_URL}/enroll`)
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(SchoolYearEnrollmentResponseDto)
  enrollTeacher(
    @Body() body: SchoolYearTeacherEnrollmentCreateDto,
    @CurrentUser() user: User,
  ): Promise<SchoolYearEnrollment> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.schoolYearEnrollmentService.enrollTeacher({
      ...body,
      teacherId,
    });
  }

  @Post(`${STUDENT_URL}/enroll`)
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(SchoolYearEnrollmentResponseDto)
  enrollStudent(
    @Body() body: SchoolYearStudentEnrollmentCreateDto,
    @CurrentUser() user: User,
  ): Promise<SchoolYearEnrollment> {
    const { id: studentId } = user.studentUserAccount;

    return this.schoolYearEnrollmentService.enrollStudent({
      ...body,
      studentId,
    });
  }

  // ADMINS

  // Batch enrollment by teacher or admin
  @Post(`${ADMIN_URL}/enroll${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(SchoolYearEnrollmentResponseDto)
  enrollTeachers(
    @Body() body: SchoolYearBatchEnrollmentCreateDto,
  ): Promise<SchoolYearEnrollment[]> {
    return this.schoolYearEnrollmentService.enrollTeachers(body);
  }

  // TEACHERS

  @Post(`${TEACHER_URL}/enroll${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(SchoolYearEnrollmentResponseDto)
  enrollStudents(
    @Body() body: SchoolYearBatchEnrollmentCreateDto,
    @CurrentUser() user: User,
  ): Promise<SchoolYearEnrollment[]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.schoolYearEnrollmentService.enrollStudents(body, teacherId);
  }
}
