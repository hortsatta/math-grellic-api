import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, IsNull, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { LessonSchedule } from '../entities/lesson-schedule.entity';
import { Lesson } from '../entities/lesson.entity';
import { LessonScheduleCreateDto } from '../dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from '../dtos/lesson-schedule-update.dto';

@Injectable()
export class LessonScheduleService {
  constructor(
    @InjectRepository(LessonSchedule)
    private readonly repo: Repository<LessonSchedule>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
  ) {}

  validateScheduleCreation(studentIds?: number[], lesson?: Lesson) {
    if (!studentIds || !studentIds.length) {
      return { error: null };
    }

    // Don't allow if schedule is assigned to specific students,
    // lesson should be available to all students
    if (studentIds?.length) {
      return {
        error: new BadRequestException(
          'Cannot set lesson to specific students at this time',
        ),
      };
    }

    if (lesson.schedules.length) {
      return {
        error: new BadRequestException(
          'Lesson cannot have more than one schedule',
        ),
      };
    }

    return { error: null };
  }

  getByLessonId(lessonId: number): Promise<LessonSchedule[]> {
    return this.repo.find({
      where: { lesson: { id: lessonId } },
    });
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

  async create(lessonScheduleDto: LessonScheduleCreateDto, teacherId: number) {
    const { lessonId, studentIds, ...moreLessonScheduleDto } =
      lessonScheduleDto;

    const lesson = await this.lessonRepo.findOne({
      where: {
        id: lessonId,
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      },
      relations: { schedules: true },
    });

    const { error } = await this.validateScheduleCreation(studentIds, lesson);

    if (error) {
      throw error;
    }

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
    teacherId: number,
  ): Promise<LessonSchedule> {
    const { startDate, studentIds } = lessonScheduleDto;

    // Get lesson schedule, cancel schedule update and throw error if not found
    const lessonSchedule = await this.repo.findOne({
      where: { id, lesson: { teacher: { id: teacherId } } },
    });

    if (!lessonSchedule) {
      throw new NotFoundException('Lesson schedule not found');
    } else if (studentIds?.length) {
      throw new BadRequestException(
        'Cannot set lesson to specific students at this time',
      );
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

  async delete(id: number, teacherId: number): Promise<boolean> {
    // Prevent if lesson has completions
    const lesson = await this.lessonRepo.findOne({
      where: {
        schedules: { id },
        teacher: { id: teacherId },
        completions: true,
      },
    });

    if (lesson.completions.length) {
      throw new BadRequestException('Cannot delete lesson schedule');
    }

    const result = await this.repo.delete({ id });

    return !!result.affected;
  }
}
