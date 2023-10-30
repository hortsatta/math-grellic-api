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
import { activityGameType } from './enums/activity.enum';
import { Activity } from './entities/activity.entity';
import { ActivityCreateDto } from './dtos/activity-create.dto';
import { ActivityUpdateDto } from './dtos/activity-update.dto';
import { ActivityResponseDto } from './dtos/activity-response.dto';
import { StudentActivityListResponseDto } from './dtos/student-activity-list-response.dto';
import { ActivityService } from './activity.service';

@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('/games')
  @UseAuthGuard(UserRole.Teacher)
  getActivityGames() {
    return activityGameType;
  }

  // TEACHERS

  @Get('/teachers/list')
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getTeacherActivitiesByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Activity[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.activityService.getPaginationTeacherActivitiesByTeacherId(
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
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.activityService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
    );
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  create(
    @Body() body: ActivityCreateDto,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.activityService.create(body, teacherId);
  }

  @Patch('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  update(
    @Param('slug') slug: string,
    @Body() body: ActivityUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.activityService.update(slug, body, teacherId);
  }

  @Delete('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.activityService.deleteBySlug(slug, teacherId);
  }

  // STUDENTS

  @Get('/students/list')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentActivityListResponseDto)
  getStudentActivitiesByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.activityService.getStudentActivitiesByStudentId(studentId, q);
  }

  @Get('/:slug/students')
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.activityService.getOneBySlugAndStudentId(slug, studentId);
  }
}
