import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  ) {}

  async findByLessonId(lessonId: number): Promise<LessonSchedule[]> {
    return this.repo.find({
      where: { lesson: { id: lessonId }, isActive: true },
    });
  }

  async findOneById(id: number): Promise<LessonSchedule> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async create(lessonScheduleDto: LessonScheduleCreateDto) {
    const { lessonId, ...moreLessonScheduleDto } = lessonScheduleDto;
    // Get lesson, cancel schedule creation and throw error if not found
    const lesson = await this.lessonService.findOneById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const lessonSchedule = this.repo.create({
      ...moreLessonScheduleDto,
      lesson,
    });

    return this.repo.save(lessonSchedule);
  }

  async update(
    id: number,
    lessonScheduleDto: LessonScheduleUpdateDto,
  ): Promise<LessonSchedule> {
    const lessonSchedule = await this.findOneById(id);

    if (!lessonSchedule) {
      throw new NotFoundException('Lesson schedule not found');
    }

    return this.repo.save({ ...lessonSchedule, ...lessonScheduleDto });
  }

  async delete(id: number) {
    const lessonSchedule = await this.findOneById(id);

    if (!lessonSchedule) {
      throw new NotFoundException('Lesson schedule not found');
    }

    return this.repo.save({ ...lessonSchedule, isActive: false });
  }
}
