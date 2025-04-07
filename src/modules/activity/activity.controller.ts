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
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user.enum';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { activityGameType } from './enums/activity.enum';
import { Activity } from './entities/activity.entity';
import { ActivityCreateDto } from './dtos/activity-create.dto';
import { ActivityUpdateDto } from './dtos/activity-update.dto';
import { ActivityResponseDto } from './dtos/activity-response.dto';
import { StudentActivityListResponseDto } from './dtos/student-activity-list-response.dto';
import { ActivityCategoryCompletionCreateDto } from './dtos/activity-category-completion-create.dto';
import { ActivityCategoryCompletionUpdateDto } from './dtos/activity-category-completion-update.dto';
import { ActivityCategoryCompletionResponseDto } from './dtos/activity-category-completion-response.dto';
import { ActivityService } from './services/activity.service';
import { TeacherActivityService } from './services/teacher-activity.service';
import { StudentActivityService } from './services/student-activity.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('activities')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly teacherActivityService: TeacherActivityService,
    private readonly studentActivityService: StudentActivityService,
  ) {}

  @Get('/games')
  @UseJwtAuthGuard(UserRole.Teacher)
  getActivityGames() {
    return activityGameType;
  }

  // TEACHERS

  @Get(`${TEACHER_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
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

    return this.teacherActivityService.getPaginationTeacherActivitiesByTeacherId(
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
  @UseSerializeInterceptor(ActivityResponseDto)
  getActivitySnippetsByTeacherId(
    @CurrentUser() user: User,
    @Query('take') take?: number,
  ): Promise<Activity[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.getActivitySnippetsByTeacherId(
      teacherId,
      take || 3,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
    );
  }

  @Post('/validate')
  @UseJwtAuthGuard(UserRole.Teacher)
  async validateActivityUpsert(
    @Body() body: ActivityCreateDto | ActivityUpdateDto,
    @CurrentUser() user: User,
    @Query('slug') slug?: string,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.validateUpsert(body, teacherId, slug);
  }

  @Post()
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  create(
    @Body() body: ActivityCreateDto,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.create(body, teacherId);
  }

  @Patch('/:slug')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  update(
    @Param('slug') slug: string,
    @Body() body: ActivityUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.update(slug, body, teacherId);
  }

  @Delete('/:slug')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.deleteBySlug(slug, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentActivityListResponseDto)
  getStudentActivitiesByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentActivityService.getStudentActivitiesByStudentId(
      studentId,
      q,
    );
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.activityService.getOneBySlugAndStudentId(slug, studentId);
  }

  @Post(`/:slug${STUDENT_URL}/completion/:categoryId`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityCategoryCompletionResponseDto)
  setActivityCategoryCompletionBySlugAndStudentId(
    @Body() body: ActivityCategoryCompletionCreateDto,
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: number,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentActivityService.createActivityCategoryCompletionBySlugAndStudentId(
      body,
      slug,
      categoryId,
      studentId,
    );
  }

  @Patch(`/:slug${STUDENT_URL}/completion/:categoryId`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityCategoryCompletionResponseDto)
  updateActivityCategoryCompletionBySlugAndStudentId(
    @Body() body: ActivityCategoryCompletionUpdateDto,
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: number,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentActivityService.updateActivityCategoryCompletionBySlugAndStudentId(
      body,
      slug,
      categoryId,
      studentId,
    );
  }
}
