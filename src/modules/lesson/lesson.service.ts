import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import dayjs from 'dayjs';

import { RecordStatus } from '#/common/enums/content.enum';
import { Lesson } from './entities/lesson.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { LessonScheduleCreateDto } from './dtos/lesson-schedule-create.dto';
import { LessonScheduleUpdateDto } from './dtos/lesson-schedule-update.dto';
import { LessonCompletionUpsertDto } from './dtos/lesson-completion-upsert.dto';
import { LessonScheduleService } from './lesson-schedule.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @Inject(LessonScheduleService)
    private readonly lessonScheduleService: LessonScheduleService,
    @InjectRepository(LessonCompletion)
    private readonly lessonCompletionRepo: Repository<LessonCompletion>,
  ) {}

  getPaginatedTeacherLessonsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = 10,
    skip: number = 0,
    q?: string,
    status?: string,
  ): Promise<[Lesson[], number]> {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        teacher: { id: teacherId },
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<Lesson> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (sortBy === 'scheduleDate') {
        return { schedules: { startDate: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    return this.lessonRepo.findAndCount({
      where: generateWhere(),
      relations: { schedules: true },
      order: generateOrder(),
      skip,
      take,
    });
  }

  getTeacherLessonsByTeacherId(
    teacherId: number,
    sort: string,
    lessonIds?: number[],
    q?: string,
    status?: string,
  ): Promise<Lesson[]> {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        teacher: { id: teacherId },
      };

      if (lessonIds?.length) {
        baseWhere = { ...baseWhere, id: In(lessonIds) };
      }

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<Lesson> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (sortBy === 'scheduleDate') {
        return { schedules: { startDate: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    return this.lessonRepo.find({
      where: generateWhere(),
      order: generateOrder(),
    });
  }

  getByIdsAndTeacherId(
    ids: number[],
    teacherId: number,
    status?: string,
  ): Promise<Lesson[]> {
    const where: FindOptionsWhere<Lesson> = status
      ? {
          id: In(ids),
          teacher: { id: teacherId },
          status: In(status.split(',')),
        }
      : { id: In(ids), teacher: { id: teacherId } };

    return this.lessonRepo.find({ where, relations: { schedules: true } });
  }

  getOneById(id: number): Promise<Lesson> {
    return this.lessonRepo.findOne({
      where: { id },
      relations: { schedules: true },
    });
  }

  async getOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        slug,
        teacher: { id: teacherId },
      };

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const lesson = await this.lessonRepo.findOne({
      where: generateWhere(),
      relations: { schedules: { students: true } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async create(lessonDto: LessonCreateDto, teacherId: number): Promise<Lesson> {
    const { startDate, studentIds, ...moreLessonDto } = lessonDto;

    // Validate lesson order number if unique for current teacher user
    const orderNumberCount = await this.lessonRepo.count({
      where: {
        orderNumber: moreLessonDto.orderNumber,
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Lesson number is already present');
    }

    if (startDate) {
      const isScheduleValid =
        await this.lessonScheduleService.validateScheduleCreation(studentIds);

      if (!isScheduleValid) {
        throw new BadRequestException('Schedule is invalid');
      }
    }

    const lesson = this.lessonRepo.create({
      ...moreLessonDto,
      teacher: { id: teacherId },
    });
    const newLesson = await this.lessonRepo.save(lesson);

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

  async update(
    slug: string,
    lessonDto: LessonUpdateDto,
    teacherId: number,
    scheduleId?: number,
  ): Promise<Lesson> {
    const { startDate, studentIds, ...moreLessonDto } = lessonDto;
    // Find lesson, throw error if none found
    const lesson = await this.lessonRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Validate lesson order number if unique for current teacher user
    const orderNumberCount = await this.lessonRepo.count({
      where: {
        orderNumber: moreLessonDto.orderNumber,
        slug: Not(slug),
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Lesson number is already present');
    }

    // Check if schedule id, if present then fetch schedule or throw error if none found
    const schedule = !!scheduleId
      ? await this.lessonScheduleService.getOneById(scheduleId)
      : null;

    if (scheduleId && !schedule) {
      throw new BadRequestException('Schedule is invalid');
    }

    // Update lesson, ignore schedule if previous lesson status is published
    const updatedLesson = await this.lessonRepo.save({
      ...lesson,
      ...moreLessonDto,
    });

    if (lesson.status === RecordStatus.Published) {
      return updatedLesson;
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

  async deleteBySlug(slug: string, teacherId: number): Promise<boolean> {
    const lesson = await this.getOneBySlugAndTeacherId(slug, teacherId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Abort if lesson had completions
    const hasCompletion = !!(await this.lessonCompletionRepo.count({
      where: { lesson: { id: lesson.id } },
    }));
    if (hasCompletion) {
      throw new BadRequestException('Cannot delete lesson');
    }

    const result = await this.lessonRepo.delete({ slug });
    return !!result.affected;

    // TODO soft delete
    // const result = await this.lessonRepo.softDelete({ slug });
    // return !!result.affected;
  }

  // Lesson schedules

  async createSchedule(
    lessonScheduleDto: LessonScheduleCreateDto,
    teacherId: number,
  ) {
    const { lessonId } = lessonScheduleDto;
    const lesson = await this.lessonRepo.findOne({
      where: {
        id: lessonId,
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
    const lesson = await this.lessonRepo.findOne({
      where: {
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

  // STUDENT

  async getStudentLessonsByStudentId(studentId: number, q?: string) {
    // TODO q
    const currentDateTime = dayjs().toDate();

    const upcomingLessonQuery = this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .where('students.id = :studentId OR students.id IS NULL', { studentId })
      .andWhere('schedules.startDate > :startDate', {
        startDate: currentDateTime,
      });

    const otherLessonsQuery = this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .leftJoinAndSelect(
        'lesson.completions',
        'completions',
        'completions.student.id = :studentId',
        { studentId },
      )
      .where('students.id = :studentId OR students.id IS NULL', { studentId })
      .andWhere('schedules.startDate <= :startDate', {
        startDate: currentDateTime,
      });

    if (q) {
      upcomingLessonQuery.andWhere('lesson.title ILIKE :q', { q });
      otherLessonsQuery.andWhere('lesson.title ILIKE :q', { q });
    }

    const upcomingLesson = await upcomingLessonQuery
      .select([
        'lesson.id',
        'lesson.createdAt',
        'lesson.updatedAt',
        'lesson.status',
        'lesson.orderNumber',
        'lesson.title',
        'lesson.slug',
        'lesson.durationSeconds',
        'lesson.excerpt',
        'schedules',
      ])
      .orderBy('schedules.startDate', 'ASC')
      .getOne();

    const otherLessons = await otherLessonsQuery
      .select([
        'lesson.id',
        'lesson.createdAt',
        'lesson.updatedAt',
        'lesson.status',
        'lesson.orderNumber',
        'lesson.title',
        'lesson.slug',
        'lesson.videoUrl',
        'lesson.durationSeconds',
        'lesson.excerpt',
        'schedules',
        'completions',
      ])
      .orderBy('lesson.orderNumber', 'DESC')
      .getMany();

    const latestLesson = otherLessons.length ? otherLessons[0] : null;
    const previousLessons =
      otherLessons.length > 1 ? otherLessons.slice(1) : [];

    return {
      upcomingLesson,
      latestLesson,
      previousLessons,
    };
  }

  async getOneBySlugAndStudentId(slug: string, studentId: number) {
    const currentDateTime = dayjs().toDate();

    const lesson = await this.lessonRepo.findOne({
      where: [
        { slug, schedules: { students: { id: studentId } } },
        { slug, schedules: { students: { id: IsNull() } } },
      ],
      relations: { schedules: true, completions: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Omit video, description, ...etc not yet reached
    if (dayjs(lesson.schedules[0].startDate).isAfter(dayjs())) {
      // Check if the nearest upcoming lesson is the same lesson, if not then throw error
      const upcomingLesson = await this.lessonRepo.findOne({
        where: [
          {
            schedules: {
              startDate: MoreThan(currentDateTime),
              students: { id: studentId },
            },
          },
          {
            schedules: {
              startDate: MoreThan(currentDateTime),
              students: { id: IsNull() },
            },
          },
        ],
        relations: { schedules: true, completions: true },
        order: { schedules: { startDate: 'ASC' } },
      });

      if (upcomingLesson?.id !== lesson.id) {
        throw new NotFoundException('Lesson not found');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { videoUrl, description, ...moreLesson } = lesson;
      return moreLesson;
    }

    return lesson;
  }

  async setLessonCompletionBySlugAndStudentId(
    body: LessonCompletionUpsertDto,
    slug: string,
    studentId: number,
  ) {
    const currentDateTime = dayjs();

    const lesson = await this.lessonRepo.findOne({
      where: [
        { slug, schedules: { students: { id: studentId } } },
        { slug, schedules: { students: { id: IsNull() } } },
      ],
      relations: { schedules: true },
    });

    if (
      !lesson ||
      (lesson.schedules?.length &&
        dayjs(lesson.schedules[0].startDate).isAfter(currentDateTime))
    ) {
      throw new NotFoundException('Lesson not available');
    }

    // Check if student has already completed the lesson
    const hasCompleted = await this.lessonCompletionRepo.findOne({
      where: { lesson: { id: lesson.id }, student: { id: studentId } },
      relations: { lesson: true, student: true },
    });
    // If request is set to complete and student has not completed the lesson yet then add lesson with student to table
    // If request is set to not complete and student has completed the lesson then delete lesson with student from table
    // If request matches the hasCompleted variable then do nothing
    let result = hasCompleted;
    if (body.isCompleted && !hasCompleted) {
      const data = { lesson: { id: lesson.id }, student: { id: studentId } };
      const lessonCompletion = this.lessonCompletionRepo.create(data);
      result = await this.lessonCompletionRepo.save(lessonCompletion);
    } else if (!body.isCompleted && hasCompleted) {
      await this.lessonCompletionRepo.delete({
        lesson: { id: lesson.id },
        student: { id: studentId },
      });
      result = null;
    }

    return !result
      ? null
      : {
          ...result,
          lesson: { id: lesson.id },
          student: { id: studentId },
        };
  }
}
