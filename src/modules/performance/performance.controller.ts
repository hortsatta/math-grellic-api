import { Controller, Get, Param, Query } from '@nestjs/common';

import { UseAuthGuard } from '#/common/guards/auth.guard';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';

import { CurrentUser } from '../user/decorators/current-user.decorator';
import { StudentPerformanceResponseDto } from './dtos/student-performance-response.dto';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ExamResponseDto } from '../exam/dtos/exam-response.dto';
import { StudentPerformance } from './models/performance.model';
import { StudentPerformanceType } from './enums/performance.enum';
import { PerformanceService } from './performance.service';

const TEACHERS_BASE_URL = 'teachers';
const STUDENTS_BASE_URL = 'students';

@Controller('performances')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // TEACHERS

  @Get(`${TEACHERS_BASE_URL}/students`)
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
  ): Promise<[StudentPerformance[], number]> {
    return this.performanceService.getPaginationStudentPerformancesByTeacherId(
      user.teacherUserAccount.id,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      performance,
    );
  }

  @Get(`${TEACHERS_BASE_URL}/students/:publicId`)
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

  @Get(`${TEACHERS_BASE_URL}/students/:publicId/exams`)
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

  @Get(`${TEACHERS_BASE_URL}/students/:publicId/exams/:slug`)
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

  // STUDENTS

  @Get(`${STUDENTS_BASE_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentPerformanceResponseDto)
  getStudentPerformanceByStudentId(
    @CurrentUser() user: User,
  ): Promise<StudentPerformance> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentPerformanceByStudentId(studentId);
  }

  @Get(`${STUDENTS_BASE_URL}/exams`)
  @UseAuthGuard(UserRole.Student)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getStudentExamsByStudentId(@CurrentUser() user: User): Promise<Exam[]> {
    const { id: studentId } = user.studentUserAccount;
    return this.performanceService.getStudentExamsByStudentId(studentId);
  }

  @Get(`${STUDENTS_BASE_URL}/exams/:slug`)
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
}
