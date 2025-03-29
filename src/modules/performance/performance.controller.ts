import { Controller, Get, Param, Query } from '@nestjs/common';

import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Activity } from '../activity/entities/activity.entity';
import { LessonResponseDto } from '../lesson/dtos/lesson-response.dto';
import { ExamResponseDto } from '../exam/dtos/exam-response.dto';
import { ActivityResponseDto } from '../activity/dtos/activity-response.dto';
import { StudentPerformance } from './models/performance.model';
import { StudentPerformanceType } from './enums/performance.enum';
import { StudentPerformanceResponseDto } from './dtos/student-performance-response.dto';
import { TeacherClassPerformanceResponseDto } from './dtos/teacher-class-performance-response.dto';
import { TeacherLessonPerformanceResponseDto } from './dtos/teacher-lesson-performance-response.dto';
import { TeacherExamPerformanceResponseDto } from './dtos/teacher-exam-performance-response.dto';
import { TeacherActivityPerformanceResponseDto } from './dtos/teacher-activity-performance-response.dto';
import { TeacherPerformanceService } from './services/teacher-performance.service';
import { StudentPerformanceService } from './services/student.performance.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('performances')
export class PerformanceController {
  constructor(
    private readonly teacherPerformanceService: TeacherPerformanceService,
    private readonly studentPerformanceService: StudentPerformanceService,
  ) {}

  // TEACHERS

  @Get(`${TEACHER_URL}/class`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherClassPerformanceResponseDto)
  getClassPerformanceByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getClassPerformanceByTeacherId(
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}/lessons`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherLessonPerformanceResponseDto)
  getLessonPerformanceByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getLessonPerformanceByTeacherId(
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}/exams`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherExamPerformanceResponseDto)
  getExamPerformanceByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getExamPerformanceByTeacherId(
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}/activities`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherActivityPerformanceResponseDto)
  getActivityPerformanceByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getActivityPerformanceByTeacherId(
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
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

    return this.teacherPerformanceService.getPaginationStudentPerformancesByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      performance,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformanceByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<StudentPerformance> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentPerformanceByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/lessons`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getStudentLessonByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<Lesson[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentLessonsByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/exams`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamsByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<Exam[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentExamsByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/exams/:slug`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamWithCompletionsByPublicIdAndSlug(
    @Param('publicId') publicId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentExamWithCompletionsByPublicIdAndSlug(
      publicId,
      slug,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/activities`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivitiesByPublicIdAndTeacherId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
  ): Promise<Activity[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentActivitiesByPublicIdAndTeacherId(
      publicId,
      teacherId,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId/activities/:slug`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivityWithCompletionsByPublicIdAndSlug(
    @Param('publicId') publicId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherPerformanceService.getStudentActivityWithCompletionsByPublicIdAndSlug(
      publicId,
      slug,
      teacherId,
    );
  }

  // STUDENTS

  @Get(`${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformanceByStudentId(
    @CurrentUser() user: User,
  ): Promise<Partial<StudentPerformance>> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentPerformanceByStudentId(
      studentId,
    );
  }

  @Get(`${STUDENT_URL}/lessons`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getStudentLessonsByStudentId(@CurrentUser() user: User): Promise<Lesson[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentLessonsByStudentId(
      studentId,
    );
  }

  @Get(`${STUDENT_URL}/exams`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamsByStudentId(@CurrentUser() user: User): Promise<Exam[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentExamsByStudentId(studentId);
  }

  @Get(`${STUDENT_URL}/exams/:slug`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamWithCompletionsBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentExamWithCompletionsBySlugAndStudentId(
      slug,
      studentId,
    );
  }

  @Get(`${STUDENT_URL}/activities`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivitiesByStudentId(
    @CurrentUser() user: User,
  ): Promise<Activity[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentActivitiesByStudentId(
      studentId,
    );
  }

  @Get(`${STUDENT_URL}/activities/:slug`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getStudentActivityWithCompletionsBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: studentId } = user.studentUserAccount;
    return this.studentPerformanceService.getStudentActivityWithCompletionsBySlugAndStudentId(
      slug,
      studentId,
    );
  }
}
