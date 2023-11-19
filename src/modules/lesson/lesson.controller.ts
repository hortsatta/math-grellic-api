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
import { Lesson } from './entities/lesson.entity';
import { LessonResponseDto } from './dtos/lesson-response.dto';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonScheduleResponseDto } from './dtos/lesson-schedule-response.dto';
import { LessonScheduleCreateDto } from './dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from './dtos/lesson-schedule-update.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { StudentLessonListResponseDto } from './dtos/student-lesson-list-response.dto';
import { LessonCompletionUpsertDto } from './dtos/lesson-completion-upsert.dto';
import { LessonCompletionResponseDto } from './dtos/lesson-completion-response.dto';
import { LessonService } from './lesson.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';
const SCHEDULE_URL = '/schedules';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // TEACHERS

  // Fetch lessons for the current teacher user
  @Get(`${TEACHER_URL}/list`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getPaginatedTeacherLessonsByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Lesson[], number]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.getPaginatedTeacherLessonsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get(`${TEACHER_URL}/list/all`)
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getTeacherLessonsByTeacherId(
    @CurrentUser() user: User,
    @Query('ids') ids?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
  ): Promise<Lesson[]> {
    const { id: teacherId } = user.teacherUserAccount;
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.lessonService.getTeacherLessonsByTeacherId(
      teacherId,
      sort,
      transformedIds,
      q,
      status,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.getOneBySlugAndTeacherId(slug, teacherId, status);
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  create(
    @Body() body: LessonCreateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
    };

    return this.lessonService.create(transformedBody, teacherId);
  }

  @Patch('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  update(
    @Param('slug') slug: string,
    @Query('schedule') scheduleId: number,
    @Body() body: LessonUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
    };

    return this.lessonService.update(
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
    return this.lessonService.deleteBySlug(slug, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentLessonListResponseDto)
  getStudentLessonsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.lessonService.getStudentLessonsByStudentId(studentId, q);
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.lessonService.getOneBySlugAndStudentId(slug, studentId);
  }

  @Post(`:slug${STUDENT_URL}/completion`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(LessonCompletionResponseDto)
  setLessonCompletionBySlugAndStudentId(
    @Body() body: LessonCompletionUpsertDto,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.lessonService.setLessonCompletionBySlugAndStudentId(
      body,
      slug,
      studentId,
    );
  }

  // SCHEDULES

  @Post(`${SCHEDULE_URL}`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonScheduleResponseDto)
  createSchedule(
    @Body() body: LessonScheduleCreateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedBody = {
      ...body,
      startDate: dayjs(body.startDate).toDate(),
    };

    return this.lessonService.createSchedule(transformedBody, teacherId);
  }

  @Patch(`${SCHEDULE_URL}/:scheduleId`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonScheduleResponseDto)
  updateSchedule(
    @Param('scheduleId') scheduleId: number,
    @Body() body: LessonScheduleUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
    };

    return this.lessonService.updateSchedule(
      scheduleId,
      transformedBody,
      teacherId,
    );
  }

  @Delete(`${SCHEDULE_URL}/:scheduleId`)
  @UseAuthGuard(UserRole.Teacher)
  deleteDelete(
    @Param('scheduleId') scheduleId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.deleteSchedule(scheduleId, teacherId);
  }
}
