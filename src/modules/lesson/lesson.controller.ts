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
import { TeacherLessonService } from './services/teacher-lesson.service';
import { StudentLessonService } from './services/student-lesson.service';
import { LessonScheduleService } from './services/lesson-schedule.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';
const SCHEDULE_URL = '/schedules';

@Controller('lessons')
export class LessonController {
  constructor(
    private readonly teacherLessonService: TeacherLessonService,
    private readonly studentLessonService: StudentLessonService,
    private readonly lessonScheduleService: LessonScheduleService,
  ) {}

  // TEACHERS

  // Fetch lessons for the current teacher user
  @Get(`${TEACHER_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getPaginatedTeacherLessonsByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<[Lesson[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherLessonService.getPaginatedTeacherLessonsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`${TEACHER_URL}/list/all`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getTeacherLessonsByTeacherId(
    @CurrentUser() user: User,
    @Query('ids') ids?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Lesson[]> {
    const { id: teacherId } = user.teacherUserAccount;
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.teacherLessonService.getTeacherLessonsByTeacherId(
      teacherId,
      sort,
      transformedIds,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`${TEACHER_URL}/list/snippets`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  getLessonSnippetsByTeacherId(
    @CurrentUser() user: User,
    @Query('take') take?: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<Lesson[]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherLessonService.getLessonSnippetsByTeacherId(
      teacherId,
      take || 3,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('status') status?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherLessonService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post()
  @UseJwtAuthGuard(UserRole.Teacher)
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

    return this.teacherLessonService.create(transformedBody, teacherId);
  }

  @Patch('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: LessonUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherLessonService.update(id, body, teacherId);
  }

  @Delete('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherLessonService.delete(id, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentLessonListResponseDto)
  getStudentLessonsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentLessonService.getStudentLessonsByStudentId(
      studentId,
      q,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentLessonService.getOneBySlugAndStudentId(
      slug,
      studentId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post(`/:id${STUDENT_URL}/completion`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(LessonCompletionResponseDto)
  setLessonCompletionByIdAndStudentId(
    @Body() body: LessonCompletionUpsertDto,
    @CurrentUser() user: User,
    @Param('id') id: number,
  ) {
    const { id: studentId } = user.studentUserAccount;

    return this.studentLessonService.setLessonCompletionByIdAndStudentId(
      body,
      id,
      studentId,
    );
  }

  // SCHEDULES

  @Post(`${SCHEDULE_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
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

    return this.lessonScheduleService.create(transformedBody, teacherId);
  }

  @Patch(`${SCHEDULE_URL}/:scheduleId`)
  @UseJwtAuthGuard(UserRole.Teacher)
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

    return this.lessonScheduleService.update(
      scheduleId,
      transformedBody,
      teacherId,
    );
  }

  @Delete(`${SCHEDULE_URL}/:scheduleId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  deleteSchedule(
    @Param('scheduleId') scheduleId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonScheduleService.delete(scheduleId, teacherId);
  }
}
