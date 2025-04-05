import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { Lesson } from '../entities/lesson.entity';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
  ) {}

  async getAllByStudentId(studentId: number): Promise<Lesson[]> {
    const allLessons = await this.lessonRepo.find({
      where: {
        status: RecordStatus.Published,
      },
      relations: {
        schedules: { students: true },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    const lessonsWithSchedule = allLessons.filter((lesson) =>
      lesson.schedules.some(
        (schedule) =>
          schedule.students != null ||
          schedule.students.some((s) => s.id === studentId),
      ),
    );

    const transformedLessons = lessonsWithSchedule.map((lesson) => {
      const schedules = lesson.schedules.filter((schedule) =>
        schedule.students.some((s) => s.id === studentId),
      );

      return { ...lesson, schedules };
    });

    return transformedLessons;
  }

  async getLessonsWithCompletionsByStudentIdAndTeacherId(
    studentId: number,
    teacherId: number,
    isStudent?: boolean,
  ): Promise<Lesson[]> {
    const currentDateTime = dayjs().toDate();

    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<Lesson> = {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      };

      if (isStudent) {
        return [
          {
            ...baseWhere,
            schedules: {
              startDate: LessThanOrEqual(currentDateTime),
              students: { id: studentId },
            },
          },
          {
            ...baseWhere,
            schedules: {
              startDate: LessThanOrEqual(currentDateTime),
              students: { id: IsNull() },
            },
          },
        ];
      }

      return [
        {
          ...baseWhere,
          schedules: {
            startDate: Not(IsNull()),
            students: { id: studentId },
          },
        },
        {
          ...baseWhere,
          schedules: {
            startDate: Not(IsNull()),
            students: { id: IsNull() },
          },
        },
      ];
    };

    const lessons = await this.lessonRepo.find({
      where: generateWhere(),
      relations: {
        completions: { student: true },
        schedules: { students: true },
      },
      order: { orderNumber: 'ASC' },
    });

    const transformedLessons = lessons.map((lesson) => {
      const completions = lesson.completions.filter(
        (completion) => completion.student.id === studentId,
      );

      const schedules = lesson.schedules
        .filter(
          (schedule) =>
            schedule.students?.length <= 0 ||
            schedule.students?.some((student) => student.id === studentId),
        )
        .map((schedule) => {
          if (dayjs(schedule.startDate).isAfter(currentDateTime)) {
            return { ...schedule, isUpcoming: true };
          }

          return schedule;
        });

      return {
        ...lesson,
        completions,
        schedules: schedules.length ? [schedules[0]] : [],
      };
    });

    return transformedLessons;
  }
}
