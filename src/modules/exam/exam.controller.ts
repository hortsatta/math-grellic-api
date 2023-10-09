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
    return this.examService.create(body, teacherId);
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
    return this.examService.update(slug, body, teacherId, scheduleId);
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

  // SCHEDULES

  @Post('/schedules')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamScheduleResponseDto)
  createSchedule(
    @Body() body: ExamScheduleCreateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.createSchedule(body, teacherId);
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
    return this.examService.updateSchedule(scheduleId, body, teacherId);
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
