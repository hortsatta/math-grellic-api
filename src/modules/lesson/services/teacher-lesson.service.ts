import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  ILike,
  In,
  FindOptionsOrder,
  FindOptionsOrderValue,
  Not,
} from 'typeorm';

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { RecordStatus } from '#/common/enums/content.enum';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { Lesson } from '../entities/lesson.entity';
import { LessonCreateDto } from '../dtos/lesson-create.dto';
import { LessonUpdateDto } from '../dtos/lesson-update.dto';
import { LessonScheduleService } from './lesson-schedule.service';

@Injectable()
export class TeacherLessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonCompletion)
    private readonly lessonCompletionRepo: Repository<LessonCompletion>,
    @Inject(LessonScheduleService)
    private readonly lessonScheduleService: LessonScheduleService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
  ) {}

  async getPaginatedTeacherLessonsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: string,
    schoolYearId?: number,
  ): Promise<[Lesson[], number]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
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
        return {
          schedules: { startDate: sortOrder as FindOptionsOrderValue },
        };
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

  async getTeacherLessonsByTeacherId(
    teacherId: number,
    sort?: string,
    lessonIds?: number[],
    q?: string,
    status?: string,
    schoolYearId?: number,
    withSchedules?: boolean,
    withCompletions?: boolean,
  ): Promise<Lesson[]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
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
      relations: { schedules: withSchedules, completions: withCompletions },
    });
  }

  async getLessonSnippetsByTeacherId(
    teacherId: number,
    take = 3,
    schoolYearId?: number,
  ): Promise<Lesson[]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const lessons = await this.lessonRepo.find({
      where: {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      },
      relations: { schedules: true },
    });

    const publishedLessonsWithoutSchedule = lessons.filter(
      (lesson) =>
        !lesson.schedules.length && lesson.status === RecordStatus.Published,
    );

    const draftLessons = lessons.filter(
      (lesson) => lesson.status === RecordStatus.Draft,
    );

    if (publishedLessonsWithoutSchedule.length + draftLessons.length >= take) {
      return [...publishedLessonsWithoutSchedule, ...draftLessons].slice(
        0,
        take,
      );
    }

    const publishedLessonsWithSchedule = lessons.filter(
      (lesson) =>
        !!lesson.schedules.length && lesson.status === RecordStatus.Published,
    );

    const targetLessons = [
      ...publishedLessonsWithoutSchedule,
      ...draftLessons,
      ...publishedLessonsWithSchedule,
    ];

    const lastIndex = !!targetLessons.length
      ? targetLessons.length > take
        ? take
        : targetLessons.length
      : 0;

    return targetLessons.slice(0, lastIndex);
  }

  async getOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Lesson> = {
        slug,
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
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
    const { startDate, studentIds, schoolYearId, ...moreLessonDto } = lessonDto;

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    // Validate lesson order number if unique for current teacher user
    const orderNumberCount = await this.lessonRepo.count({
      where: {
        orderNumber: moreLessonDto.orderNumber,
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Lesson number is already present');
    }

    if (startDate) {
      const { error: scheduleError } =
        await this.lessonScheduleService.validateScheduleCreation(studentIds);

      if (scheduleError) {
        throw scheduleError;
      }
    }

    const lesson = this.lessonRepo.create({
      ...moreLessonDto,
      teacher: { id: teacherId },
      schoolYear: { id: schoolYear.id },
    });
    const newLesson = await this.lessonRepo.save(lesson);

    if (!startDate || newLesson.status !== RecordStatus.Published) {
      return newLesson;
    }

    // If startDate is present then create schedule, convert from instance to plain
    // and return it with new lesson
    const schedule = await this.lessonScheduleService.create(
      {
        startDate,
        lessonId: newLesson.id,
        studentIds,
      },
      teacherId,
    );

    return { ...newLesson, schedules: [schedule] };
  }

  async update(
    id: number,
    lessonDto: LessonUpdateDto,
    teacherId: number,
  ): Promise<Lesson> {
    const { startDate, studentIds } = lessonDto;

    // Find lesson, throw error if none found
    const lesson = await this.lessonRepo.findOne({
      where: { id, teacher: { id: teacherId } },
      relations: { completions: true, schoolYear: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    } else if (
      lesson.status === RecordStatus.Published &&
      lessonDto.status !== RecordStatus.Published &&
      lesson.completions.length
    ) {
      throw new BadRequestException('Lesson has completions');
    }

    // Validate lesson order number if unique for current teacher user
    const orderNumberCount = await this.lessonRepo.count({
      where: {
        orderNumber: lessonDto.orderNumber,
        id: Not(id),
        teacher: { id: teacherId },
        schoolYear: { id: lesson.schoolYear.id },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Lesson number is already present');
    }

    if (startDate) {
      const { error: scheduleError } =
        await this.lessonScheduleService.validateScheduleCreation(studentIds);

      if (scheduleError) {
        throw scheduleError;
      }
    }

    const updatedLesson = await this.lessonRepo.save({
      ...lesson,
      ...lessonDto,
    });

    if (!startDate || updatedLesson.status !== RecordStatus.Published) {
      return updatedLesson;
    }

    const schedule = await this.lessonScheduleService.create(
      {
        startDate,
        lessonId: updatedLesson.id,
        studentIds,
      },
      teacherId,
    );

    return { ...updatedLesson, schedules: [schedule] };
  }

  async delete(id: number, teacherId: number): Promise<boolean> {
    // Find lesson, throw error if none found
    const lesson = await this.lessonRepo.findOne({
      where: { id, teacher: { id: teacherId } },
    });

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

    const result = await this.lessonRepo.delete({ id });
    return !!result.affected;

    // TODO soft delete
    // const result = await this.lessonRepo.softDelete({ slug });
    // return !!result.affected;
  }
}
