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

const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('activities')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly teacherActivityService: TeacherActivityService,
    private readonly studentActivityService: StudentActivityService,
  ) {}

  // ADMINS

  @Get(`${ADMIN_URL}${TEACHER_URL}/:teacherId/count`)
  @UseJwtAuthGuard(UserRole.Admin)
  getTeacherActivityCountByAdmin(
    @Param('teacherId') teacherId: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<number> {
    return this.teacherActivityService.getTeacherActivityCountByTeacherId(
      teacherId,
      schoolYearId,
    );
  }

  @Get(`${ADMIN_URL}${TEACHER_URL}/:teacherId/list/all`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ActivityResponseDto)
  getTeacherActivitiesByTeacherIdAndAdmin(
    @Param('teacherId') teacherId: number,
    @Query('ids') ids?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Activity[]> {
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.teacherActivityService.getTeacherActivitiesByTeacherId(
      teacherId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      transformedIds,
      q,
      status,
    );
  }

  // TEACHERS

  @Get('/games')
  @UseJwtAuthGuard(UserRole.Teacher)
  getActivityGames() {
    return activityGameType;
  }

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
    @Query('sy') schoolYearId?: number,
  ): Promise<[Activity[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.teacherActivityService.getPaginationTeacherActivitiesByTeacherId(
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
  @UseSerializeInterceptor(ActivityResponseDto)
  getActivitySnippetsByTeacherId(
    @CurrentUser() user: User,
    @Query('take') take?: number,
    @Query('sy') schoolYearId?: number,
  ): Promise<Activity[]> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.getActivitySnippetsByTeacherId(
      teacherId,
      take || 3,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndTeacherId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('status') status?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.getOneBySlugAndTeacherId(
      slug,
      teacherId,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post('/validate')
  @UseJwtAuthGuard(UserRole.Teacher)
  async validateActivityUpsert(
    @CurrentUser() user: User,
    @Body() body: ActivityCreateDto | ActivityUpdateDto,
    @Query('id') id?: number,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.validateUpsert(body, teacherId, id);
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

  @Patch('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ActivityResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: ActivityUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Activity> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.teacherActivityService.update(id, body, teacherId);
  }

  @Delete('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const {
      publicId,
      teacherUserAccount: { id: teacherId },
    } = user;

    return this.teacherActivityService.delete(id, teacherId, publicId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentActivityListResponseDto)
  getStudentActivitiesByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.studentActivityService.getStudentActivitiesByStudentId(
      studentId,
      q,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:slug${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlugAndStudentId(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.activityService.getOneBySlugAndStudentId(
      slug,
      studentId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post(`/:id${STUDENT_URL}/completion/:categoryId`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityCategoryCompletionResponseDto)
  setActivityCategoryCompletionByIdAndStudentId(
    @Body() body: ActivityCategoryCompletionCreateDto,
    @Param('id') id: number,
    @Param('categoryId') categoryId: number,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;

    return this.studentActivityService.createActivityCategoryCompletionByIdAndStudentId(
      body,
      id,
      categoryId,
      studentId,
    );
  }

  @Patch(`/:id${STUDENT_URL}/completion/:categoryId`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(ActivityCategoryCompletionResponseDto)
  updateActivityCategoryCompletionByIdAndStudentId(
    @Body() body: ActivityCategoryCompletionUpdateDto,
    @Param('id') id: number,
    @Param('categoryId') categoryId: number,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;

    return this.studentActivityService.updateActivityCategoryCompletionByIdAndStudentId(
      body,
      id,
      categoryId,
      studentId,
    );
  }
}
