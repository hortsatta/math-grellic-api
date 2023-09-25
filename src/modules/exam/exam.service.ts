import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  In,
  Not,
  Repository,
} from 'typeorm';
import dayjs from 'dayjs';

import { RecordStatus } from '#/common/enums/content.enum';
import { LessonService } from '../lesson/lesson.service';
import { Exam } from './entities/exam.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ExamCreateDto } from './dtos/exam-create.dto';
import { ExamScheduleService } from './exam-schedule.service';
import { ExamUpdateDto } from './dtos/exam-update.dto';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
    @Inject(ExamScheduleService)
    private readonly examScheduleService: ExamScheduleService,
    @Inject(LessonService)
    private readonly lessonService: LessonService,
  ) {}

  getPaginationTeacherExamsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = 10,
    skip: number = 0,
    q?: string,
    status?: string,
  ): Promise<[Exam[], number]> {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
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

    const generateOrder = (): FindOptionsOrder<Exam> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (sortBy === 'scheduleDate') {
        return { schedules: { startDate: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    return this.examRepo.findAndCount({
      where: generateWhere(),
      relations: { schedules: true },
      order: generateOrder(),
      skip,
      take,
    });
  }

  async create(examDto: ExamCreateDto, teacherId: number): Promise<Exam> {
    const {
      startDate,
      endDate,
      studentIds,
      coveredLessonIds,
      questions,
      ...moreExamDto
    } = examDto;

    // Validate exam order number if unique for current teacher user
    const orderNumberCount = await this.examRepo.count({
      where: {
        orderNumber: moreExamDto.orderNumber,
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Exam number is already present');
    }

    // Check if all questions have atleast one isCorrect choice
    questions.forEach((question) => {
      const isCorrectChoice = question.choices.find(
        (choice) => choice.isCorrect,
      );
      if (!isCorrectChoice) {
        throw new BadRequestException(
          'Question should have at least 1 correct choice',
        );
      }
    });

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons = await this.lessonService.getByIdsAndTeacherId(
        coveredLessonIds,
        teacherId,
        RecordStatus.Published,
      );
      if (lessons.length !== coveredLessonIds.length) {
        throw new BadRequestException('Covered lessons is invalid');
      }
    }

    // FOR SCHEDULE, check before creating exam to avoid conflicts
    // If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    if (startDate) {
      if (
        !endDate ||
        dayjs(startDate).isAfter(endDate) ||
        dayjs(startDate).isSame(endDate)
      ) {
        throw new BadRequestException('Schedule is invalid');
      }

      const { error: scheduleError } =
        await this.examScheduleService.validateScheduleUpsert(
          startDate,
          endDate,
          teacherId,
          studentIds,
        );

      if (scheduleError) {
        throw scheduleError;
      }
    }

    // Create covered lessons object
    const coveredLessons = coveredLessonIds
      ? coveredLessonIds.map((lessonId) => ({ id: lessonId }))
      : [];
    // Create exam entity and save it
    const exam = this.examRepo.create({
      ...moreExamDto,
      coveredLessons,
      questions,
      teacher: { id: teacherId },
    });
    const { id } = await this.examRepo.save(exam);
    // Manually query newly created exam since relations aren't returned on exam creation
    const newExam = await this.examRepo.findOne({
      where: { id },
      relations: {
        coveredLessons: true,
        questions: { choices: true },
      },
    });

    if (!startDate) {
      return newExam;
    }

    // FOR SCHEDULE
    // If startDate is present then create schedule, convert from instance to plain
    // and return it with new exam
    const schedule = await this.examScheduleService.create(
      {
        startDate,
        endDate,
        examId: newExam.id,
        studentIds,
      },
      teacherId,
    );

    return { ...newExam, schedules: [schedule] };
  }

  async update(
    slug: string,
    examDto: ExamUpdateDto,
    teacherId: number,
    scheduleId?: number,
  ): Promise<Exam> {
    const {
      startDate,
      endDate,
      studentIds,
      coveredLessonIds,
      questions,
      ...moreExamDto
    } = examDto;

    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Validate exam order number if unique for current teacher user
    // Except order number of target exam
    const orderNumberCount = await this.examRepo.count({
      where: {
        orderNumber: moreExamDto.orderNumber,
        slug: Not(slug),
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Exam number is already present');
    }

    // TODO find all exam questions and check
    // Check if all questions have atleast one isCorrect choice
    for (const question of questions) {
      let choices = question.choices;

      if (question.id) {
        const targetQuestion = await this.examQuestionRepo.findOne({
          where: { id: question.id },
          relations: { choices: true },
        });
        const updatedChoices =
          targetQuestion?.choices?.map((choice) => {
            const updatedChoice = question.choices.find(
              (c) => c.id && c.id === choice.id,
            );
            return updatedChoice ?? choice;
          }) || [];
        const newChoices = choices.filter((c) => !c.id);
        choices = [...updatedChoices, ...newChoices];
      }

      const isCorrectChoice = choices.find((choice) => choice.isCorrect);

      if (!isCorrectChoice) {
        throw new BadRequestException(
          'Question should have at least 1 correct choice',
        );
      }
    }

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons = await this.lessonService.getByIdsAndTeacherId(
        coveredLessonIds,
        teacherId,
        RecordStatus.Published,
      );
      if (lessons.length !== coveredLessonIds.length) {
        throw new BadRequestException('Covered lessons is invalid');
      }
    }

    // FOR SCHEDULE
    // If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    if (startDate && !scheduleId) {
      if (
        !endDate ||
        dayjs(startDate).isAfter(endDate) ||
        dayjs(startDate).isSame(endDate)
      ) {
        throw new BadRequestException('Schedule is invalid');
      }

      const { error: scheduleError } =
        await this.examScheduleService.validateScheduleUpsert(
          startDate,
          endDate,
          teacherId,
          studentIds,
          exam.id,
        );

      if (scheduleError) {
        throw scheduleError;
      }
    } else if (scheduleId) {
      const examSchedule =
        await this.examScheduleService.getOneById(scheduleId);

      const { error: scheduleError } =
        await this.examScheduleService.validateScheduleUpsert(
          startDate || examSchedule.startDate,
          endDate || examSchedule.endDate,
          teacherId,
          studentIds,
          exam.id,
          scheduleId,
        );

      if (scheduleError) {
        throw scheduleError;
      }
    }

    // Check if schedule id, if present then fetch schedule or throw error if none found
    const schedule = !!scheduleId
      ? await this.examScheduleService.getOneById(scheduleId)
      : null;

    if (scheduleId && !schedule) {
      throw new BadRequestException('Schedule is invalid');
    }

    const coveredLessons = coveredLessonIds
      ? coveredLessonIds.map((lessonId) => ({ id: lessonId }))
      : [];

    // Update lesson, ignore schedule if previous lesson status is published
    const updatedExam = await this.examRepo.save({
      ...exam,
      ...moreExamDto,
      coveredLessons,
      questions,
    });

    if (exam.status === RecordStatus.Published) {
      return updatedExam;
    }

    // FOR SCHEDULE
    // Update schedule if scheduleId is present,
    // else if no scheduleId but startDate is present then add new schedule
    if (!!scheduleId) {
      const updatedSchedule = await this.examScheduleService.update(
        scheduleId,
        { startDate, endDate, studentIds },
        teacherId,
      );
      return { ...updatedExam, schedules: [updatedSchedule] };
    } else if (!scheduleId && startDate) {
      const newSchedule = await this.examScheduleService.create(
        {
          startDate,
          endDate,
          examId: updatedExam.id,
          studentIds,
        },
        teacherId,
      );
      return { ...updatedExam, schedules: [newSchedule] };
    }

    // Just return exam without schedule if no scheduleId or startDate found
    return updatedExam;
  }
}
