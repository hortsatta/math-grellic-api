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
import dayjs from 'dayjs';

import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseAuthGuard } from '#/common/guards/auth.guard';
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
import { ExamService } from './exam.service';

@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  // TEACHERS

  @Get('/teachers/list')
  @UseAuthGuard(UserRole.Teacher)
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

    return this.examService.getPaginationTeacherExamsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get('/:slug/teachers')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.getOneBySlugAndTeacherId(slug, teacherId, status);
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
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

    return this.examService.create(transformedBody, teacherId);
  }

  @Patch('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  update(
    @Param('slug') slug: string,
    @Query('schedule') scheduleId: number,
    @Body() body: ExamUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, endDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
      ...(endDate && { endDate: dayjs(endDate).toDate() }),
    };

    return this.examService.update(
      slug,
      transformedBody,
      teacherId,
      scheduleId,
    );
  }

  @Delete('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.deleteBySlug(slug, teacherId);
  }

  // STUDENTS

  @Get('/students/list')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentExamListResponseDto)
  getStudentExamsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.examService.getStudentExamsByStudentId(studentId, q);
  }

  @Get('/:slug/students')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.examService.getOneBySlugAndStudentId(slug, studentId);
  }

  @Post(':slug/students/completion')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ExamCompletionResponseDto)
  setExamCompletionBySlugAndStudentId(
    @Body() body: ExamCompletionCreateDto,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.examService.createExamCompletionBySlugAndStudentId(
      body,
      slug,
      studentId,
    );
  }

  // SCHEDULES

  @Post('/schedules')
  @UseAuthGuard(UserRole.Teacher)
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

    return this.examService.createSchedule(transformedBody, teacherId);
  }

  @Patch('/schedules/:scheduleId')
  @UseAuthGuard(UserRole.Teacher)
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

    return this.examService.updateSchedule(
      scheduleId,
      transformedBody,
      teacherId,
    );
  }

  @Delete('/schedules/:scheduleId')
  @UseAuthGuard(UserRole.Teacher)
  deleteSchedule(
    @Param('scheduleId') scheduleId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.deleteSchedule(scheduleId, teacherId);
  }
}
