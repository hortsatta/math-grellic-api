import { Controller, Get, Param, Query } from '@nestjs/common';

import { UseAuthGuard } from '#/common/guards/auth.guard';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';

import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Activity } from '../activity/entities/activity.entity';
import { ExamResponseDto } from '../exam/dtos/exam-response.dto';
import { ActivityResponseDto } from '../activity/dtos/activity-response.dto';
import { StudentPerformance } from './models/performance.model';
import { StudentPerformanceType } from './enums/performance.enum';
import { StudentPerformanceResponseDto } from './dtos/student-performance-response.dto';
import { TeacherClassPerformanceResponseDto } from './dtos/teacher-class-performance-response.dto';
import { PerformanceService } from './performance.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('performances')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // TEACHERS

  @Get(`${TEACHER_URL}/class`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(TeacherClassPerformanceResponseDto)
  getClassPerformanceByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getClassPerformanceByTeacherId(teacherId);
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/list`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformancesByCurrentTeacherUser(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('perf') performance?: StudentPerformanceType,
  ): Promise<[Partial<StudentPerformance>[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.performanceService.getPaginationStudentPerformancesByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      performance,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformanceByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<StudentPerformance> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getStudentPerformanceByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/exams`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamsByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<Exam[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getStudentExamsByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/exams/:slug`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamWithCompletionsByPublicIdAndSlug(
    @Param('publicId') publicId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getStudentExamWithCompletionsByPublicIdAndSlug(
      publicId,
      slug,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/activities`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivitiesByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<Activity[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getStudentActivitiesByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/activities/:slug`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivityWithCompletionsByPublicIdAndSlug(
    @Param('publicId') publicId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.performanceService.getStudentActivityWithCompletionsByPublicIdAndSlug(
      publicId,
      slug,
      teacherId,
    );
  }

  // STUDENTS

  @Get(`${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformanceByStudentId(
    @CurrentUser() user: User,
  ): Promise<StudentPerformance> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentPerformanceByStudentId(studentId);
  }

  @Get(`${STUDENT_URL}/exams`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamsByStudentId(@CurrentUser() user: User): Promise<Exam[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentExamsByStudentId(studentId);
  }

  @Get(`${STUDENT_URL}/exams/:slug`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamWithCompletionsBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentExamWithCompletionsBySlugAndStudentId(
      slug,
      studentId,
    );
  }

  @Get(`${STUDENT_URL}/activities`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivitiesByStudentId(
    @CurrentUser() user: User,
  ): Promise<Activity[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentActivitiesByStudentId(studentId);
  }

  @Get(`${STUDENT_URL}/activities/:slug`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivityWithCompletionsBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentActivityWithCompletionsBySlugAndStudentId(
      slug,
      studentId,
    );
  }
}
