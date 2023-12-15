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
import { UseAuthGuard } from '#/common/guards/auth.guard';
import { UserRole } from '../user/enums/user.enum';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { MeetingSchedule } from './entities/meeting-schedule.entity';
import { MeetingScheduleResponseDto } from './dtos/meeting-schedule-response.dto';
import { MeetingScheduleCreateDto } from './dtos/meeting-schedule-create.dto';
import { MeetingScheduleUpdateDto } from './dtos/meeting-schedule-update.dto';
import { TimelineSchedulesResponseDto } from './dtos/timeline-schedules-response.dto';
import { StudentMeetingScheduleListResponseDto } from './dtos/student-meeting-schedule-list-response.dto';
import { ScheduleService } from './schedule.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // TEACHERS

  @Get(`${TEACHER_URL}`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TimelineSchedulesResponseDto)
  getSchedulesByDateRangeAndTeacherId(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    const fromDate = dayjs(from).toDate();
    const toDate = dayjs(to).toDate();

    return this.scheduleService.getTimelineSchedulesByDateRangeAndTeacherId(
      fromDate,
      toDate,
      teacherId,
    );
  }

  @Get(`/meetings${TEACHER_URL}`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(MeetingScheduleResponseDto)
  getTeacherMeetingSchedulesByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[MeetingSchedule[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.scheduleService.getPaginationTeacherMeetingSchedulesByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
    );
  }

  @Get(`/:id${TEACHER_URL}`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(MeetingScheduleResponseDto)
  @UseFilterFieldsInterceptor()
  getOneByIdAndTeacherId(
    @Param('id') id: number,
    @CurrentUser() user: User,
  ): Promise<MeetingSchedule> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.scheduleService.getOneByIdAndUserAccountId(id, teacherId);
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(MeetingScheduleResponseDto)
  create(
    @Body() body: MeetingScheduleCreateDto,
    @CurrentUser() user: User,
  ): Promise<MeetingSchedule> {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedBody = {
      ...body,
      startDate: dayjs(body.startDate).toDate(),
      endDate: dayjs(body.endDate).toDate(),
    };

    return this.scheduleService.create(transformedBody, teacherId);
  }

  @Patch('/:id')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(MeetingScheduleResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: MeetingScheduleUpdateDto,
    @CurrentUser() user: User,
  ): Promise<MeetingSchedule> {
    const { id: teacherId } = user.teacherUserAccount;
    const { startDate, endDate, ...moreBody } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).toDate() }),
      ...(endDate && { endDate: dayjs(endDate).toDate() }),
    };

    return this.scheduleService.update(id, transformedBody, teacherId);
  }

  @Delete('/:id')
  @UseAuthGuard(UserRole.Teacher)
  delete(@Param('id') id: number, @CurrentUser() user: User): Promise<boolean> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.scheduleService.delete(id, teacherId);
  }

  // STUDENTS

  @Get(`${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(TimelineSchedulesResponseDto)
  getSchedulesByDateRangeAndStudentId(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    const fromDate = dayjs(from).toDate();
    const toDate = dayjs(to).toDate();

    return this.scheduleService.getTimelineSchedulesByDateRangeAndStudentId(
      fromDate,
      toDate,
      studentId,
    );
  }

  @Get(`/meetings${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentMeetingScheduleListResponseDto)
  getStudentMeetingSchedulesByStudentId(@CurrentUser() user: User) {
    const { id: studentId } = user.studentUserAccount;
    return this.scheduleService.getStudentMeetingSchedulesByStudentId(
      studentId,
    );
  }

  @Get(`/:id${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(MeetingScheduleResponseDto)
  @UseFilterFieldsInterceptor()
  getOneByIdAndStudentId(
    @Param('id') id: number,
    @CurrentUser() user: User,
  ): Promise<MeetingSchedule> {
    const { id: studentId } = user.studentUserAccount;
    return this.scheduleService.getOneByIdAndUserAccountId(id, studentId, true);
  }
}
