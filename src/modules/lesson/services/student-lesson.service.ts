import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull, MoreThan } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { Lesson } from '../entities/lesson.entity';
import { LessonCompletionUpsertDto } from '../dtos/lesson-completion-upsert.dto';

@Injectable()
export class StudentLessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonCompletion)
    private readonly lessonCompletionRepo: Repository<LessonCompletion>,
  ) {}

  async getStudentLessonsByStudentId(studentId: number, q?: string) {
    const currentDateTime = dayjs().toDate();

    const upcomingLessonQuery = this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .where('lesson.status = :status', { status: RecordStatus.Published })
      .andWhere('schedules.startDate > :currentDateTime', { currentDateTime })
      .andWhere(
        new Brackets((sqb) => {
          sqb.where('students.id = :studentId', { studentId });
          sqb.orWhere('students.id IS NULL');
        }),
      );

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
      .where('lesson.status = :status', { status: RecordStatus.Published })
      .andWhere('schedules.startDate <= :currentDateTime', { currentDateTime })
      .andWhere(
        new Brackets((sqb) => {
          sqb.where('students.id = :studentId', { studentId });
          sqb.orWhere('students.id IS NULL');
        }),
      );

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
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: studentId } },
        },
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: IsNull() } },
        },
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
            status: RecordStatus.Published,
            schedules: {
              startDate: MoreThan(currentDateTime),
              students: { id: studentId },
            },
          },
          {
            status: RecordStatus.Published,
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
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: studentId } },
        },
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: IsNull() } },
        },
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
