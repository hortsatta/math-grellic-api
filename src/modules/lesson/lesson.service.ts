import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
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

  findByTeacherIdPagination(
    teacherId: number,
    order: { [x: string]: 'ASC' | 'DESC' } = { orderNumber: 'ASC' },
    take: number = 10,
    skip: number = 0,
  ): Promise<[Lesson[], number]> {
    return this.repo.findAndCount({
      where: { teacher: { id: teacherId }, isActive: true },
      order,
      skip,
      take,
    });
  }

  findOneById(id: number): Promise<Lesson> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async findOneBySlug(slug: string): Promise<Lesson> {
    const lesson = await this.repo.findOne({ where: { slug, isActive: true } });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async create(lessonDto: LessonCreateDto, user: User): Promise<Lesson> {
    const { startDate, studentIds, ...moreLessonDto } = lessonDto;

    const isValid = await this.lessonScheduleService.validateScheduleCreation(
      startDate,
      studentIds,
    );

    if (!isValid) {
      throw new BadRequestException('Schedule is invalid');
    }

    const lesson = this.repo.create({
      ...moreLessonDto,
      teacher: user.teacherUserAccount,
    });
    const newLesson = await this.repo.save(lesson);

    if (!startDate) {
      return newLesson;
    }

    // If startDate is present then create schedule, convert from instance to plain
    // and return it with new lesson
    const schedule = await this.lessonScheduleService.create({
      startDate,
      lessonId: newLesson.id,
      studentIds,
    });

    return { ...newLesson, schedules: [schedule] };
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
