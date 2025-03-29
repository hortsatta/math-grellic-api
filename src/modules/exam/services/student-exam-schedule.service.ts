import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { ExamSchedule } from '../entities/exam-schedule.entity';

@Injectable()
export class StudentExamScheduleService {
  constructor(
    @InjectRepository(ExamSchedule)
    private readonly repo: Repository<ExamSchedule>,
  ) {}

  async getByDateRangeAndTeacherAndStudentId(
    fromDate: Date,
    toDate: Date,
    teacherId: number,
    studentId: number,
  ) {
    const currentDateTime = dayjs();

    const schedules = await this.repo.find({
      where: {
        startDate: Between(fromDate, toDate),
        students: { id: studentId },
        exam: { status: RecordStatus.Published, teacher: { id: teacherId } },
      },
      relations: { exam: true },
      order: { startDate: 'ASC' },
    });

    const transformedSchedules = schedules.map((s) => {
      const { exam, ...moreSchedule } = s;
      const {
        slug,
        orderNumber,
        title,
        pointsPerQuestion,
        visibleQuestionsCount,
        passingPoints,
        excerpt,
      } = exam;

      return {
        ...moreSchedule,
        exam: {
          slug,
          orderNumber,
          title,
          pointsPerQuestion,
          visibleQuestionsCount,
          passingPoints,
          excerpt,
        },
      };
    });

    const previousSchedules = transformedSchedules.filter((s) =>
      dayjs(s.endDate).isSameOrBefore(currentDateTime),
    );

    const upcomingSchedule = transformedSchedules.filter((s) =>
      dayjs(s.startDate).isAfter(currentDateTime),
    )[0];

    const ongoingSchedules = transformedSchedules.filter(
      (s) =>
        dayjs(s.startDate).isSameOrBefore(currentDateTime) &&
        dayjs(s.endDate).isAfter(currentDateTime),
    );

    if (ongoingSchedules.length) {
      return [...previousSchedules, ...ongoingSchedules];
    } else if (upcomingSchedule) {
      return [...previousSchedules, upcomingSchedule];
    }

    return previousSchedules;
  }
}
