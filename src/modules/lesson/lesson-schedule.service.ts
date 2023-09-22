import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    } else {
      // Check if all specified student ids are valid
      const students = await this.userService.getStudentsByIds(studentIds);
      if (students.length !== studentIds.length) {
        return false;
      }

      return true;
    }
  }

  getByLessonId(lessonId: number): Promise<LessonSchedule[]> {
    return this.repo.find({
      where: { lesson: { id: lessonId } },
    });
  }

  getOneById(id: number): Promise<LessonSchedule> {
    return this.repo.findOne({ where: { id } });
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
}
