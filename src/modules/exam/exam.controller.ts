import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import dayjs from '#/common/configs/dayjs.config';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user.enum';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Exam } from './entities/exam.entity';
import { ExamResponseDto } from './dtos/exam-response.dto';
import { ExamCreateDto } from './dtos/exam-create.dto';
import { ExamUpdateDto } from './dtos/exam-update.dto';
import { ExamScheduleResponseDto } from './dtos/exam-schedule-response.dto';
import { ExamScheduleCreateDto } from './dtos/exam-schedule-create.dto';
import { ExamScheduleUpdateDto } from './dtos/exam-schedule-update.dto';
import { ExamCompletionResponseDto } from './dtos/exam-completion-response.dto';
import { StudentExamListResponseDto } from './dtos/student-exam-list-response.dto';
import { ExamCompletionCreateDto } from './dtos/exam-completion-create.dto';
import { StudentExamService } from './services/student-exam.service';
import { TeacherExamService } from './services/teacher-exam.service';

const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';
const SCHEDULE_URL = '/schedules';

@Controller('exams')
export class ExamController {
  constructor(
    private readonly teacherExamService: TeacherExamService,
    private readonly studentExamService: StudentExamService,
  ) {}

  // ADMINS

  @Get(`${ADMIN_URL}${TEACHER_URL}/:teacherId/count`)
  @UseJwtAuthGuard(UserRole.Admin)
  getTeacherExamCountByAdmin(
    @Param('teacherId') teacherId: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<number> {
    return this.teacherExamService.getTeacherExamCountByTeacherId(
      teacherId,
      schoolYearId,
    );
  }

  @Get(`${ADMIN_URL}${TEACHER_URL}/:teacherId/list/all`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getTeacherExamsByTeacherIdAndAdmin(
    @Param('teacherId') teacherId: number,
    @Query('ids') ids?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Exam[]> {
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.teacherExamService.getTeacherExamsByTeacherId(
      teacherId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      sort,
      transformedIds,
      q,
      status,
    );
  }

  // TEACHERS

  @Get(`${TEACHER_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getTeacherExamsByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<[Exam[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherExamService.getPaginationTeacherExamsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`${TEACHER_URL}/list/snippets`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getExamSnippetsByTeacherId(
    @CurrentUser() user: User,
    @Query('take') take?: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<Exam[]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherExamService.getExamSnippetsByTeacherId(
      teacherId,
      take || 3,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('status') status?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherExamService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post('/validate')
  @UseJwtAuthGuard(UserRole.Teacher)
  async validateExamUpsert(
    @Body() body: ExamCreateDto | ExamUpdateDto,
    @CurrentUser() user: User,
    @Query('id') id?: number,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, endDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
      ...(endDate && { endDate: dayjs(endDate).toDate() }),
    };

    return this.teacherExamService.validateUpsert(
      transformedBody,
      teacherId,
      id,
    );
  }

  @Post()
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  create(
    @Body() body: ExamCreateDto,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, endDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
      ...(endDate && { endDate: dayjs(endDate).toDate() }),
    };

    return this.teacherExamService.create(transformedBody, teacherId);
  }

  @Patch('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: ExamUpdateDto,
    @CurrentUser() user: User,
    @Query('strict') strict?: number,
  ): Promise<Exam> {
    const {
      publicId,
      teacherUserAccount: { id: teacherId },
    } = user;

    return this.teacherExamService.update(
      id,
      body,
      teacherId,
      strict == 1,
      publicId,
    );
  }

  @Delete('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const {
      publicId,
      teacherUserAccount: { id: teacherId },
    } = user;

    return this.teacherExamService.delete(id, teacherId, publicId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentExamListResponseDto)
  getStudentExamsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentExamService.getStudentExamsByStudentId(
      studentId,
      q,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentExamService.getOneBySlugAndStudentId(
      slug,
      studentId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post(`/:id${STUDENT_URL}/completion`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamCompletionResponseDto)
  setExamCompletionByIdAndStudentId(
    @Body() body: ExamCompletionCreateDto,
    @CurrentUser() user: User,
    @Param('id') id: number,
  ) {
    const { id: studentId } = user.studentUserAccount;

    return this.studentExamService.createExamCompletionByIdAndStudentId(
      body,
      id,
      studentId,
    );
  }

  // SCHEDULES

  @Post(`${SCHEDULE_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamScheduleResponseDto)
  createSchedule(
    @Body() body: ExamScheduleCreateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedBody = {
      ...body,
      startDate: dayjs(body.startDate).toDate(),
      endDate: dayjs(body.endDate).toDate(),
    };

    return this.teacherExamService.createSchedule(transformedBody, teacherId);
  }

  @Patch(`${SCHEDULE_URL}/:scheduleId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamScheduleResponseDto)
  updateSchedule(
    @Param('scheduleId') scheduleId: number,
    @Body() body: ExamScheduleUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, endDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
      ...(endDate && { endDate: dayjs(endDate).toDate() }),
    };

    return this.teacherExamService.updateSchedule(
      scheduleId,
      transformedBody,
      teacherId,
    );
  }

  @Delete(`${SCHEDULE_URL}/:scheduleId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  async deleteSchedule(
    @Param('scheduleId') scheduleId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherExamService.deleteSchedule(scheduleId, teacherId);
  }
}
