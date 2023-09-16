import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserService } from '../user/user.service';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonScheduleCreateDto } from './dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from './dtos/lesson-schedule-update.dto';
import { LessonService } from './lesson.service';

@Injectable()
export class LessonScheduleService {
  constructor(
    @InjectRepository(LessonSchedule) private repo: Repository<LessonSchedule>,
    @Inject(forwardRef(() => LessonService))
    private lessonService: LessonService,
    @Inject(UserService) private userService: UserService,
  ) {}

  async validateScheduleCreation(studentIds?: number[]): Promise<boolean> {
    if (!studentIds || !studentIds.length) {
      return true;
    } else {
      // Check if all specified student ids are valid
      const students = await this.userService.findStudentsByIds(studentIds);
      if (students.length !== studentIds.length) {
        return false;
      }

      return true;
    }
  }

  findByLessonId(lessonId: number): Promise<LessonSchedule[]> {
    return this.repo.find({
      where: { lesson: { id: lessonId }, isActive: true },
    });
  }

  findOneById(id: number): Promise<LessonSchedule> {
    return this.repo.findOne({ where: { id, isActive: true } });
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
    const lessonSchedule = await this.findOneById(id);
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

  async delete(id: number) {
    const lessonSchedule = await this.findOneById(id);

    if (!lessonSchedule) {
      throw new NotFoundException('Lesson schedule not found');
    }

    return this.repo.save({ ...lessonSchedule, isActive: false });
  }
}
