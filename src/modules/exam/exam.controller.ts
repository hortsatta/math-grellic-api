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

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';
const SCHEDULE_URL = '/schedules';

@Controller('exams')
export class ExamController {
  constructor(
    private readonly teacherExamService: TeacherExamService,
    private readonly studentExamService: StudentExamService,
  ) {}

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
  ): Promise<[Exam[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherExamService.getPaginationTeacherExamsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get(`${TEACHER_URL}/list/snippets`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getExamSnippetsByTeacherId(
    @CurrentUser() user: User,
    @Query('take') take?: number,
  ): Promise<Exam[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherExamService.getExamSnippetsByTeacherId(
      teacherId,
      take || 3,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherExamService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
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

  @Patch('/:slug')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  update(
    @Param('slug') slug: string,
    @Body() body: ExamUpdateDto,
    @CurrentUser() user: User,
    @Query('strict') strict?: number,
  ): Promise<Exam> {
    const {
      publicId,
      teacherUserAccount: { id: teacherId },
    } = user;

    return this.teacherExamService.update(
      slug,
      body,
      teacherId,
      strict == 1,
      publicId,
    );
  }

  @Post('/validate')
  @UseJwtAuthGuard(UserRole.Teacher)
  async validateExamUpsert(
    @Body() body: ExamCreateDto | ExamUpdateDto,
    @CurrentUser() user: User,
    @Query('slug') slug?: string,
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
      slug,
    );
  }

  @Delete('/:slug')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const {
      publicId,
      teacherUserAccount: { id: teacherId },
    } = user;
    return this.teacherExamService.deleteBySlug(slug, teacherId, publicId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentExamListResponseDto)
  getStudentExamsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentExamService.getStudentExamsByStudentId(studentId, q);
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentExamService.getOneBySlugAndStudentId(slug, studentId);
  }

  @Post(`/:slug${STUDENT_URL}/completion`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamCompletionResponseDto)
  setExamCompletionBySlugAndStudentId(
    @Body() body: ExamCompletionCreateDto,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentExamService.createExamCompletionBySlugAndStudentId(
      body,
      slug,
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
