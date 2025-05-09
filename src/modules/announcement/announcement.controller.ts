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
import { AnnouncementService } from './announcement.service';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementCreateDto } from './dtos/announcement-create.dto';
import { AnnouncementResponseDto } from './dtos/announcement-response.dto';
import { AnnouncementUpdateDto } from './dtos/announcement-update.dto';
import { TeacherAnnouncementsResponseDto } from './dtos/teacher-announcements-response.dto';
import { StudentAnnouncementsResponseDto } from './dtos/student-announcements-response.dto';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // TEACHERS

  @Get(`${TEACHER_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherAnnouncementsResponseDto)
  getAnnouncementsByTeacherId(
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: teacherId } = user.teacherUserAccount;

    return this.announcementService.getAnnouncementsByTeacherId(
      teacherId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:id${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(AnnouncementResponseDto)
  @UseFilterFieldsInterceptor()
  getAnnouncementByIdAndTeacherId(
    @Param('id') id: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.announcementService.getAnnouncementByIdAndTeacherId(
      id,
      teacherId,
    );
  }

  @Post()
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(AnnouncementResponseDto)
  create(
    @Body() body: AnnouncementCreateDto,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedBody = {
      ...body,
      startDate: dayjs(body.startDate).toDate(),
    };

    return this.announcementService.create(transformedBody, teacherId);
  }

  @Patch('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(AnnouncementResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: AnnouncementUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
    };

    return this.announcementService.update(id, transformedBody, teacherId);
  }

  @Delete('/:id')
  @UseJwtAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.announcementService.delete(id, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentAnnouncementsResponseDto)
  @UseFilterFieldsInterceptor()
  getAnnouncementsByStudentId(
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: studentId } = user.studentUserAccount;

    return this.announcementService.getAnnouncementsByStudentId(
      studentId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Get(`/:id${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(AnnouncementResponseDto)
  @UseFilterFieldsInterceptor()
  getAnnouncementByIdAndStudentId(
    @Param('id') id: number,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    const { id: studentId } = user.studentUserAccount;
    return this.announcementService.getAnnouncementByIdAndStudentId(
      id,
      studentId,
    );
  }
}
