import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Lesson } from './entities/lesson.entity';
import { LessonCreateDto } from './dtos/lesson-create.dto';

@Injectable()
export class LessonService {
  constructor(@InjectRepository(Lesson) private repo: Repository<Lesson>) {}

  // TEMP make pagination
  async findAll(): Promise<Lesson[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneBySlug(slug: string): Promise<Lesson> {
    return this.repo.findOne({ where: { slug, isActive: true } });
  }

  async create(lessonDto: LessonCreateDto): Promise<Lesson> {
    const { startDate, ...moreLessonDto } = lessonDto;

    const lesson = this.repo.create(moreLessonDto);
    const newLesson = await this.repo.save(lesson);

    if (!startDate) {
      return newLesson;
    }

    // const

    // return this.repo.save(lesson);
    return lesson;
  }
}
