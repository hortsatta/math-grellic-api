import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { User } from '../user/entities/user.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { LessonScheduleCreateDto } from './dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from './dtos/lesson-schedule-update.dto';
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
    q?: string,
    status?: string,
  ): Promise<[Lesson[], number]> {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        teacher: { id: teacherId },
        isActive: true,
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    return this.repo.findAndCount({
      where: generateWhere(),
      relations: { schedules: true },
      order,
      skip,
      take,
    });
  }

  findOneById(id: number): Promise<Lesson> {
    return this.repo.findOne({
      where: { id, isActive: true },
      relations: { schedules: true },
    });
  }

  async findOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        slug,
        isActive: true,
        teacher: { id: teacherId },
      };

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const lesson = await this.repo.findOne({
      where: generateWhere(),
      relations: { schedules: { students: true } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  // TODO set lesson number to not unique for next school year, do manula check
  async create(lessonDto: LessonCreateDto, user: User): Promise<Lesson> {
    const { startDate, studentIds, ...moreLessonDto } = lessonDto;

    if (startDate) {
      const isValid =
        await this.lessonScheduleService.validateScheduleCreation(studentIds);

      if (!isValid) {
        throw new BadRequestException('Schedule is invalid');
      }
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

  // TODO set lesson number to not unique for next school year, do manula check
  async update(
    slug: string,
    lessonDto: LessonUpdateDto,
    teacherId: number,
    scheduleId?: number,
  ): Promise<Lesson> {
    const { startDate, studentIds, ...moreLessonDto } = lessonDto;
    // Find lesson, throw error if none found
    const lesson = await this.repo.findOne({
      where: { slug, teacher: { id: teacherId } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if schedule id, if present then fetch schedule or throw error if none found
    const schedule = !!scheduleId
      ? await this.lessonScheduleService.findOneById(scheduleId)
      : null;

    if (scheduleId && !schedule) {
      throw new BadRequestException('Schedule is invalid');
    }

    // Update lesson, ignore schedule if previous lesson status is published
    const updatedLesson = await this.repo.save({ ...lesson, ...moreLessonDto });

    if (lesson.status === RecordStatus.Published) {
      return;
    }

    // Update schedule if scheduleId is present,
    // else if no scheduleId but startDate is present then add new schedule
    if (!!scheduleId) {
      const updatedSchedule = await this.lessonScheduleService.update(
        scheduleId,
        { startDate, studentIds },
      );
      return { ...updatedLesson, schedules: [updatedSchedule] };
    } else if (!scheduleId && startDate) {
      const newSchedule = await this.lessonScheduleService.create({
        startDate,
        lessonId: updatedLesson.id,
        studentIds,
      });
      return { ...updatedLesson, schedules: [newSchedule] };
    }
    // Just return lesson without schedule if no scheduleId or startDate found
    return updatedLesson;
  }

  // TODO delete
  async delete(id: number): Promise<void> {
    const lesson = await this.findOneById(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.repo.save({ ...lesson, isActive: false });
    return;
  }

  // Lesson schedules

  async createSchedule(
    lessonScheduleDto: LessonScheduleCreateDto,
    teacherId: number,
  ) {
    const { lessonId } = lessonScheduleDto;
    const lesson = await this.repo.findOne({
      where: {
        id: lessonId,
        isActive: true,
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.lessonScheduleService.create(lessonScheduleDto);
  }

  async updateSchedule(
    scheduleId: number,
    lessonScheduleDto: LessonScheduleUpdateDto,
    teacherId: number,
  ) {
    const lesson = await this.repo.findOne({
      where: {
        isActive: true,
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schedules: { id: scheduleId },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson schedule not found');
    }

    return await this.lessonScheduleService.update(
      scheduleId,
      lessonScheduleDto,
    );
  }
}
