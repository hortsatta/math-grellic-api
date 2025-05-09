import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { MeetingSchedule } from '../entities/meeting-schedule.entity';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(MeetingSchedule)
    private readonly repo: Repository<MeetingSchedule>,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
  ) {}

  async getOneByIdAndUserAccountId(
    id: number,
    userAccountId: number,
    isStudent?: boolean,
  ): Promise<MeetingSchedule> {
    const meeting = await this.repo.findOne({
      where: { id },
      relations: { schoolYear: true },
    });

    if (!meeting) {
      throw new BadRequestException('Invalid meeting');
    }

    if (isStudent) {
      const currentDateTime = dayjs().toDate();

      const teacher = await this.teacherUserService.getTeacherByStudentId(
        userAccountId,
        meeting.schoolYear.id,
      );

      if (!teacher) {
        throw new NotFoundException('Student not found');
      }

      const targetMeetingSchedule = await this.repo.findOne({
        where: [
          { id, teacher: { id: teacher.id }, students: { id: userAccountId } },
          { id, teacher: { id: teacher.id }, students: { id: IsNull() } },
        ],
      });

      const upcomingMeetingSchedules = await this.repo.find({
        where: [
          {
            startDate: MoreThan(currentDateTime),
            teacher: { id: teacher.id },
            students: { id: userAccountId },
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

      if (!targetMeetingSchedule) {
        throw new NotFoundException('Schedule not found');
      }

      if (dayjs(targetMeetingSchedule.startDate).isAfter(currentDateTime)) {
        const isUpcoming = upcomingMeetingSchedules.some(
          (schedule) => schedule.id === targetMeetingSchedule.id,
        );

        if (!isUpcoming) {
          throw new NotFoundException('Schedule not found');
        }
      }

      return targetMeetingSchedule;
    }

    return this.repo.findOne({ where: { id, teacher: { id: userAccountId } } });
  }
}
