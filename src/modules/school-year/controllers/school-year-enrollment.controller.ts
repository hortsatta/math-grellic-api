import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UserRole } from '#/modules/user/enums/user.enum';
import { CurrentUser } from '#/modules/user/decorators/current-user.decorator';
import { UseJwtAuthGuard } from '#/modules/auth/auth.guard';
import { User } from '#/modules/user/entities/user.entity';
import { UserLastStepRegisterDto } from '#/modules/user/dtos/user-last-step-register.dto';
import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearEnrollmentResponseDto } from '../dtos/school-year-enrollment-response.dto';
import { SchoolYearTeacherEnrollmentCreateDto } from '../dtos/school-year-teacher-enrollment-create.dto';
import { SchoolYearStudentEnrollmentCreateDto } from '../dtos/school-year-student-enrollment-create.dto';
import { SchoolYearStudentEnrollmentNewCreateDto } from '../dtos/school-year-student-enrollment-new-create.dto';
import { SchoolYearBatchEnrollmentCreateDto } from '../dtos/school-year-batch-enrollment-create.dto';
import { SchoolYearEnrollmentNewResponseDto } from '../dtos/school-year-enrollment-new-response.dto';
import { SchoolYearEnrollmentApprovalDto } from '../dtos/school-year-enrollment-approval.dto';
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

  @Get('/enroll-new/confirm/validate')
  validateUserRegistrationToken(
    @Query('token') token: string,
  ): Promise<boolean> {
    return this.schoolYearEnrollmentService.validateUserEnrollmentNewToken(
      token,
    );
  }

  @Post('/enroll-new/confirm')
  confirmUserEnrollmentNewLastStep(
    @Body() body: UserLastStepRegisterDto,
  ): Promise<{ publicId: string }> {
    return this.schoolYearEnrollmentService.confirmUserEnrollmentNewLastStep(
      body,
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

  @Post(`${TEACHER_URL}/enroll-new${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(SchoolYearEnrollmentNewResponseDto)
  enrollNewStudent(
    @Body() body: SchoolYearStudentEnrollmentNewCreateDto,
    @CurrentUser() user: User,
  ): Promise<{ user: User; enrollment: SchoolYearEnrollment }> {
    const { studentUser, studentEnrollment } = body;
    const { id: teacherId, publicId: teacherPublicId } = user;

    return this.schoolYearEnrollmentService.enrollNewStudent(
      studentUser,
      studentEnrollment,
      teacherPublicId,
      teacherId,
    );
  }

  @Patch(`${TEACHER_URL}${STUDENT_URL}/approve/:enrollmentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  approveStudentByIdAndTeacherId(
    @CurrentUser() user: User,
    @Param('enrollmentId') enrollmentId: number,
    @Body() body: SchoolYearEnrollmentApprovalDto,
  ): Promise<{
    approvalStatus: SchoolYearEnrollment['approvalStatus'];
    approvalDate: SchoolYearEnrollment['approvalDate'];
    approvalRejectedReason: SchoolYearEnrollment['approvalRejectedReason'];
  }> {
    return this.schoolYearEnrollmentService.setStudentApprovalStatus(
      enrollmentId,
      body,
      user.id,
      user.id,
    );
  }
}
