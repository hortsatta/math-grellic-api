import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { StudentExamScheduleService } from '#/modules/exam/services/student-exam-schedule.service';
import { UserService } from '#/modules/user/user.service';
import { LessonScheduleService } from '#/modules/lesson/lesson-schedule.service';
import { MeetingSchedule } from '../entities/meeting-schedule.entity';

@Injectable()
export class StudentScheduleService {
  constructor(
    @InjectRepository(MeetingSchedule)
    private readonly repo: Repository<MeetingSchedule>,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(LessonScheduleService)
    private readonly lessonScheduleService: LessonScheduleService,
    @Inject(forwardRef(() => StudentExamScheduleService))
    private readonly studentExamScheduleService: StudentExamScheduleService,
  ) {}

  async getStudentMeetingSchedulesByStudentId(studentId: number) {
    const currentDateTime = dayjs().toDate();

    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new NotFoundException('Student not found');
    }

    const upcomingMeetingSchedules = await this.repo.find({
      where: [
        {
          startDate: MoreThan(currentDateTime),
          teacher: { id: teacher.id },
          students: { id: studentId },
        },
        {
          startDate: MoreThan(currentDateTime),
          teacher: { id: teacher.id },
          students: { id: IsNull() },
        },
      ],
      order: { startDate: 'DESC' },
      take: 3,
    });

    const otherMeetingSchedules = await this.repo.find({
      where: [
        {
          id: Not(In(upcomingMeetingSchedules.map((s) => s.id))),
          teacher: { id: teacher.id },
          startDate: LessThanOrEqual(currentDateTime),
          students: { id: studentId },
        },
        {
          id: Not(In(upcomingMeetingSchedules.map((s) => s.id))),
          teacher: { id: teacher.id },
          startDate: LessThanOrEqual(currentDateTime),
          students: { id: IsNull() },
        },
      ],
      order: { startDate: 'DESC' },
    });

    const currentMeetingSchedules = otherMeetingSchedules.filter((schedule) =>
      dayjs(currentDateTime).isBetween(
        schedule.startDate,
        schedule.endDate,
        'day',
        '[]',
      ),
    );

    const previousMeetingSchedules = otherMeetingSchedules.filter(
      (schedule) =>
        !dayjs(currentDateTime).isBetween(
          schedule.startDate,
          schedule.endDate,
          'day',
          '[]',
        ),
    );

    return {
      upcomingMeetingSchedules,
      currentMeetingSchedules,
      previousMeetingSchedules,
    };
  }

  async getTimelineSchedulesByDateRangeAndStudentId(
    fromDate: Date,
    toDate: Date,
    studentId: number,
  ) {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new NotFoundException('Student not found');
    }

    const lessonSchedules =
      await this.lessonScheduleService.getByDateRangeAndTeacherAndStudentId(
        fromDate,
        toDate,
        teacher.id,
        studentId,
      );

    const examSchedules =
      await this.studentExamScheduleService.getByDateRangeAndTeacherAndStudentId(
        fromDate,
        toDate,
        teacher.id,
        studentId,
      );

    const meetingScheduleBaseWhere: FindOptionsWhere<MeetingSchedule> = {
      startDate: Between(fromDate, toDate),
      teacher: { id: teacher.id },
    };

    const meetingSchedules = await this.repo.find({
      where: [
        {
          ...meetingScheduleBaseWhere,
          students: { id: IsNull() },
        },
        { ...meetingScheduleBaseWhere, students: { id: studentId } },
      ],
      order: { startDate: 'ASC' },
    });

    return { lessonSchedules, examSchedules, meetingSchedules };
  }
}
