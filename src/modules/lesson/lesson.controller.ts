import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { LessonService } from './lesson.service';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // Fetch lessons for the current teacher user
  @Get('/teachers/list')
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  findByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Lesson[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.lessonService.findByTeacherIdPagination(
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
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  findOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Lesson> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.findOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
    );
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  create(
    @Body() body: LessonCreateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    return this.lessonService.create(body, user);
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
  @HttpCode(204)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.lessonService.deleteBySlug(slug, teacherId);
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
