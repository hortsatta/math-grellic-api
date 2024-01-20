import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import dayjs from '#/common/configs/dayjs.config';
import { AnnouncementService } from './announcement.service';
import { UseAuthGuard } from '#/common/guards/auth.guard';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
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
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherAnnouncementsResponseDto)
  getAnnouncementsByTeacherId(@CurrentUser() user: User) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.announcementService.getAnnouncementsByTeacherId(teacherId);
  }

  @Get(`/:id${TEACHER_URL}`)
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.announcementService.delete(id, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/list`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentAnnouncementsResponseDto)
  @UseFilterFieldsInterceptor()
  getAnnouncementsByStudentId(@CurrentUser() user: User) {
    const { id: studentId } = user.studentUserAccount;
    return this.announcementService.getAnnouncementsByStudentId(studentId);
  }

  @Get(`/:id${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
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
