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

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // TEACHERS

  // Fetch lessons for the current teacher user
  @Get('/teachers/list')
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

  @Get('/teachers/list/all')
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

  @Get('/:slug/teachers')
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
    return this.lessonService.create(body, teacherId);
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
    return this.lessonService.update(slug, body, teacherId, scheduleId);
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

  @Get('/students/list')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentLessonListResponseDto)
  getStudentLessonsByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.lessonService.getStudentLessonsByStudentId(studentId, q);
  }

  @Get('/:slug/students')
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

  @Post(':slug/students/completion')
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

  // Lesson schedule
  @Post('/schedules')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonScheduleResponseDto)
  createSchedule(
    @Body() body: LessonScheduleCreateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.createSchedule(body, teacherId);
  }

  @Patch('/schedules/:scheduleId')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonScheduleResponseDto)
  updateSchedule(
    @Param('scheduleId') scheduleId: number,
    @Body() body: LessonScheduleUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.updateSchedule(scheduleId, body, teacherId);
  }

  // TODO delete schedule
}
