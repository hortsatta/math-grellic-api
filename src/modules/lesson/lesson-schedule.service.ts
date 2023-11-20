import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import dayjs from '#/common/configs/dayjs.config';

import { RecordStatus } from '#/common/enums/content.enum';
import { UserApprovalStatus } from '../user/enums/user.enum';
import { UserService } from '../user/user.service';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonScheduleCreateDto } from './dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from './dtos/lesson-schedule-update.dto';

@Injectable()
export class LessonScheduleService {
  constructor(
    @InjectRepository(LessonSchedule)
    private readonly repo: Repository<LessonSchedule>,
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

  async validateScheduleCreation(studentIds?: number[]): Promise<boolean> {
    if (!studentIds || !studentIds.length) {
      return true;
    }

    // Check if all specified student ids are valid
    const students = await this.userService.getStudentsByIds(
      studentIds,
      UserApprovalStatus.Approved,
    );
    if (students.length !== studentIds.length) {
      return false;
    }

    return true;
  }

  getByLessonId(lessonId: number): Promise<LessonSchedule[]> {
    return this.repo.find({
      where: { lesson: { id: lessonId } },
    });
  }

  getOneById(id: number): Promise<LessonSchedule> {
    return this.repo.findOne({ where: { id } });
  }

  getByDateRangeAndTeacherId(fromDate: Date, toDate: Date, teacherId: number) {
    return this.repo.find({
      where: {
        startDate: Between(fromDate, toDate),
        lesson: { status: RecordStatus.Published, teacher: { id: teacherId } },
      },
      relations: { lesson: true },
      order: { startDate: 'ASC' },
    });
  }

  async getByDateRangeAndTeacherAndStudentId(
    fromDate: Date,
    toDate: Date,
    teacherId: number,
    studentId: number,
  ) {
    const currentDateTime = dayjs();

    const baseWhere: FindOptionsWhere<LessonSchedule> = {
      startDate: Between(fromDate, toDate),
      lesson: { status: RecordStatus.Published, teacher: { id: teacherId } },
    };

    const schedules = await this.repo.find({
      where: [
        {
          ...baseWhere,
          students: { id: IsNull() },
        },
        {
          ...baseWhere,
          students: { id: studentId },
        },
      ],
      relations: { lesson: true },
      order: { startDate: 'ASC' },
    });

    const transformedSchedules = schedules.map((s) => {
      const { lesson, ...moreSchedule } = s;
      const { slug, orderNumber, title, durationSeconds, excerpt } = lesson;

      return {
        ...moreSchedule,
        lesson: {
          slug,
          orderNumber,
          title,
          durationSeconds,
          excerpt,
        },
      };
    });

    const previousSchedules = transformedSchedules.filter((s) =>
      dayjs(s.startDate).isSameOrBefore(currentDateTime),
    );

    const upcomingSchedule = transformedSchedules.filter((s) =>
      dayjs(s.startDate).isAfter(currentDateTime),
    )[0];

    if (upcomingSchedule) {
      return [...previousSchedules, upcomingSchedule];
    }

    return previousSchedules;
  }

  async create(lessonScheduleDto: LessonScheduleCreateDto) {
    const { lessonId, studentIds, ...moreLessonScheduleDto } =
      lessonScheduleDto;

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    const lessonSchedule = this.repo.create({
      ...moreLessonScheduleDto,
      students,
      lesson: { id: lessonId },
    });

    return this.repo.save(lessonSchedule);
  }

  async update(
    id: number,
    lessonScheduleDto: LessonScheduleUpdateDto,
  ): Promise<LessonSchedule> {
    const { startDate, studentIds } = lessonScheduleDto;
    // Get lesson schedule, cancel schedule update and throw error if not found
    const lessonSchedule = await this.getOneById(id);
    if (!lessonSchedule) {
      throw new NotFoundException('Lesson schedule not found');
    }

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    return this.repo.save({
      ...lessonSchedule,
      startDate,
      students,
      lesson: lessonSchedule.lesson,
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return !!result.affected;
  }
}
