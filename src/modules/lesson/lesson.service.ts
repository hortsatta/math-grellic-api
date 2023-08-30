import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Lesson } from './entities/lesson.entity';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { LessonScheduleService } from './lesson-schedule.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private repo: Repository<Lesson>,
    @Inject(forwardRef(() => LessonScheduleService))
    private lessonScheduleService: LessonScheduleService,
  ) {}

  // TODO make pagination
  async findAll(): Promise<Lesson[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneById(id: number): Promise<Lesson> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async findOneBySlug(slug: string): Promise<Lesson> {
    try {
      const lesson = await this.repo
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.schedules', 'schedule')
        .where({ slug, isActive: true })
        .getOneOrFail();

      return lesson;
    } catch (error) {
      throw new NotFoundException('Lesson not found');
    }
  }

  async create(lessonDto: LessonCreateDto): Promise<Lesson> {
    const { startDate, ...moreLessonDto } = lessonDto;

    const lesson = this.repo.create(moreLessonDto);
    const newLesson = await this.repo.save(lesson);

    if (!startDate) {
      return newLesson;
    }

    // If startDate is present then create schedule, convert from instance to plain
    // and return it with new lesson
    const schedule = await this.lessonScheduleService.create({
      startDate,
      lessonId: newLesson.id,
    });

    return { ...newLesson, schedules: [schedule] } as Lesson;
  }

  async update(id: number, lessonDto: LessonUpdateDto): Promise<Lesson> {
    const lesson = await this.findOneById(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.repo.save({ ...lesson, ...lessonDto });
  }

  async delete(id: number): Promise<void> {
    const lesson = await this.findOneById(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.repo.save({ ...lesson, isActive: false });
    return;
  }
}
