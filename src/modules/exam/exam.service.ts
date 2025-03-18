import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { stripHtml as stringStripHtml } from 'string-strip-html';

import dayjs from '#/common/configs/dayjs.config';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { shuffleArray } from '#/common/helpers/array.helper';
import { ExamScheduleStatus, RecordStatus } from '#/common/enums/content.enum';
import { UserService } from '../user/user.service';
import { LessonService } from '../lesson/lesson.service';
import { UploadService } from '../upload/upload.service';
import { Exam } from './entities/exam.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ExamQuestionChoice } from './entities/exam-question-choice.entity';
import { ExamCompletion } from './entities/exam-completion.entity';
import { ExamCreateDto } from './dtos/exam-create.dto';
import { ExamUpdateDto } from './dtos/exam-update.dto';
import { ExamQuestionUpdateDto } from './dtos/exam-question-update.dto';
import { ExamScheduleCreateDto } from './dtos/exam-schedule-create.dto';
import { ExamScheduleUpdateDto } from './dtos/exam-schedule-update.dto';
import { ExamCompletionCreateDto } from './dtos/exam-completion-create.dto';
import { ExamScheduleService } from './exam-schedule.service';
import { ExamQuestionCreateDto } from './dtos/exam-question-create.dto';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamQuestionChoice)
    private readonly examQuestionChoiceRepo: Repository<ExamQuestionChoice>,
    @InjectRepository(ExamCompletion)
    private readonly examCompletionRepo: Repository<ExamCompletion>,
    @Inject(ExamScheduleService)
    private readonly examScheduleService: ExamScheduleService,
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(UploadService)
    private readonly uploadService: UploadService,
    private configService: ConfigService,
  ) {}

  stripHtml(
    html: string,
    onEmpty?: () => void,
    onInvalidQuestion?: () => void,
    onInvalidImage?: () => void,
  ): string {
    const { result } = stringStripHtml(html || '', {
      cb: ({ tag, deleteFrom, deleteTo, insert, rangesArr }) => {
        if (tag) {
          switch (tag.name) {
            case 'span': {
              let value = insert;

              const isInlineMath = tag.attributes.some(
                (attr) =>
                  attr.name === 'data-type' && attr.value === 'inline-math',
              );

              if (isInlineMath) {
                value = tag.attributes.find(
                  (attr) => attr.name === 'value',
                )?.value;

                if (!value?.trim().length) {
                  onInvalidQuestion && onInvalidQuestion();
                }
              }

              rangesArr.push(deleteFrom || 0, deleteTo || undefined, value);
              break;
            }
            case 'img': {
              const src = tag.attributes.find((attr) => attr.name === 'src');

              if (!src?.value.trim().length) {
                onInvalidImage && onInvalidImage();
              }

              rangesArr.push(deleteFrom || 0, deleteTo || undefined, 'img');
              break;
            }
            default:
              rangesArr.push(deleteFrom || 0, deleteTo || undefined, insert);
              break;
          }
        } else {
          // default action which does nothing different from normal, non-callback operation
          rangesArr.push(deleteFrom || 0, deleteTo || undefined, insert);
        }
      },
    });

    if (!result.trim().length) {
      onEmpty && onEmpty();
    }

    return result;
  }

  validateExamQuestion(
    questions: ExamQuestionCreateDto[] | ExamQuestionUpdateDto[],
  ) {
    questions.forEach((question: any) => {
      this.stripHtml(
        question.text,
        () => {
          throw new BadRequestException('Question is invalid');
        },
        () => {
          throw new BadRequestException('An equation from a question is empty');
        },
        () => {
          throw new BadRequestException('An image from a question is invalid');
        },
      );

      // Check if choice text field are not empty by trimming and stripping html
      question.choices.forEach((choice: any) => {
        this.stripHtml(
          choice.text,
          () => {
            throw new BadRequestException('Choice is invalid');
          },
          () => {
            throw new BadRequestException('An equation from a choice is empty');
          },
          () => {
            throw new BadRequestException('An image from a choice is invalid');
          },
        );
      });

      // Check if all questions have atleast one isCorrect choice
      const hasCorrectChoice = question.choices.some(
        (choice: any) => choice.isCorrect,
      );

      if (!hasCorrectChoice) {
        throw new BadRequestException(
          'Question should have an answer from the choices',
        );
      }
    });
  }

  getPaginationTeacherExamsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
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

  getTeacherExamsByTeacherId(
    teacherId: number,
    sort?: string,
    examIds?: number[],
    q?: string,
    status?: string,
    withSchedules?: boolean,
    withCompletions?: boolean,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
        teacher: { id: teacherId },
      };

      if (examIds?.length) {
        baseWhere = { ...baseWhere, id: In(examIds) };
      }

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

    return this.examRepo.find({
      where: generateWhere(),
      order: generateOrder(),
      relations: { schedules: withSchedules, completions: withCompletions },
    });
  }

  async getExamSnippetsByTeacherId(
    teacherId: number,
    take = 3,
  ): Promise<Exam[]> {
    const exams = await this.examRepo.find({
      where: { teacher: { id: teacherId } },
      relations: { schedules: true },
    });

    const publishedExamsWithoutSchedule = exams.filter(
      (exam) =>
        !exam.schedules.length && exam.status === RecordStatus.Published,
    );

    const draftExams = exams.filter(
      (exam) => exam.status === RecordStatus.Draft,
    );

    if (publishedExamsWithoutSchedule.length + draftExams.length >= take) {
      return [...publishedExamsWithoutSchedule, ...draftExams].slice(0, take);
    }

    const publishedExamsWithSchedule = exams.filter(
      (exam) =>
        !!exam.schedules.length && exam.status === RecordStatus.Published,
    );

    const targetExams = [
      ...publishedExamsWithoutSchedule,
      ...draftExams,
      ...publishedExamsWithSchedule,
    ];

    const lastIndex = !!targetExams.length
      ? targetExams.length > take
        ? take
        : targetExams.length
      : 0;

    return targetExams.slice(0, lastIndex);
  }

  async getExamsWithCompletionsByStudentIdAndTeacherId(
    studentId: number,
    teacherId: number,
    isStudent?: boolean,
  ): Promise<Exam[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<Exam> = {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      };

      if (isStudent) {
        return {
          ...baseWhere,
          schedules: {
            startDate: LessThanOrEqual(dayjs().toDate()),
            students: { id: studentId },
          },
        };
      }

      return {
        ...baseWhere,
        schedules: {
          startDate: Not(IsNull()),
          students: { id: studentId },
        },
      };
    };

    const exams = await this.examRepo.find({
      where: generateWhere(),
      relations: {
        completions: { student: true },
        schedules: { students: true },
      },
      order: { orderNumber: 'ASC' },
    });

    const transformedExams = exams.map((exam) => {
      const completions = exam.completions.filter(
        (completion) => completion.student.id === studentId,
      );

      const schedules = exam.schedules
        .filter((schedule) =>
          schedule.students?.some((student) => student.id === studentId),
        )
        .sort(
          (scheduleA, scheduleB) =>
            scheduleB.startDate.valueOf() - scheduleA.startDate.valueOf(),
        );

      return {
        ...exam,
        completions,
        schedules,
      };
    });

    return transformedExams;
  }

  async getOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
        slug,
        teacher: { id: teacherId },
      };

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const exam = await this.examRepo.findOne({
      where: generateWhere(),
      relations: {
        coveredLessons: true,
        questions: { choices: true },
        schedules: { students: true },
      },
      order: {
        questions: { orderNumber: 'ASC', choices: { orderNumber: 'ASC' } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async validateUpsert(
    examDto: ExamCreateDto | ExamUpdateDto,
    teacherId: number,
    slug?: string,
    scheduleId?: number,
  ) {
    if (!slug?.trim()) {
      return this.validateCreateExam(examDto as ExamCreateDto, teacherId);
    }

    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
      relations: { questions: { choices: true } },
    });

    return this.validateUpdateExam(
      examDto as ExamUpdateDto,
      slug,
      exam,
      teacherId,
      scheduleId,
    );
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

    await this.validateCreateExam(examDto, teacherId);

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
    strict?: boolean,
    publicId?: string,
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
      relations: { questions: { choices: true } },
    });

    await this.validateUpdateExam(examDto, slug, exam, teacherId, scheduleId);

    if (strict && publicId.trim().length) {
      // Define base path and delete exam images if exists
      const basePath = `${this.configService.get<string>(
        'SUPABASE_BASE_FOLDER_NAME',
      )}/${publicId.toLowerCase()}/exams/e${exam.orderNumber}`;

      await this.uploadService.deleteFolderRecursively(basePath);
    }

    const coveredLessons = coveredLessonIds
      ? coveredLessonIds.map((lessonId) => ({ id: lessonId }))
      : [];

    // Delete questions and choices not included in request
    await this.deleteExamQuestionsAndChoices(questions, exam);

    // Update exam, ignore schedule if previous exam status is published
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

  async deleteBySlug(
    slug: string,
    teacherId: number,
    publicId: string,
  ): Promise<boolean> {
    const exam = await this.getOneBySlugAndTeacherId(slug, teacherId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Abort if exam had completions
    const hasCompletion = !!(await this.examCompletionRepo.count({
      where: { exam: { id: exam.id } },
    }));
    if (hasCompletion) {
      throw new BadRequestException('Cannot delete exam');
    }

    // Define base path and delete exam images if exists
    const basePath = `${this.configService.get<string>(
      'SUPABASE_BASE_FOLDER_NAME',
    )}/${publicId.toLowerCase()}/exams/e${exam.orderNumber}`;

    await this.uploadService.deleteFolderRecursively(basePath);

    const result = await this.examRepo.delete({ slug });
    return !!result.affected;
  }

  async deleteExamQuestionsAndChoices(
    questions: ExamQuestionUpdateDto[],
    exam: Exam,
  ) {
    const targetQuestionIds = questions.filter((q) => !!q.id).map((q) => q.id);

    // Delete questions not included in update
    const questionsToDelete = exam.questions.filter(
      (q) => !targetQuestionIds.includes(q.id),
    );
    await this.examQuestionRepo.remove(questionsToDelete);

    // Delete choices not included in update
    await Promise.all(
      questions
        .filter((q) => !!q.id)
        .map(async (targetQuestion) => {
          const currentQuestion = exam.questions.find(
            (q) => q.id === targetQuestion.id,
          );

          const targetChoiceIds = targetQuestion.choices
            .filter((c) => !!c.id)
            .map((c) => c.id);

          // Delete questions not included in update
          const choicesToDelete = currentQuestion.choices.filter(
            (c) => !targetChoiceIds.includes(c.id),
          );
          await this.examQuestionChoiceRepo.remove(choicesToDelete);
        }),
    );
  }

  async createSchedule(
    examScheduleDto: ExamScheduleCreateDto,
    teacherId: number,
  ) {
    const { examId, startDate, endDate, studentIds } = examScheduleDto;

    const exam = await this.examRepo.findOne({
      where: {
        id: examId,
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // check before creating exam to avoid conflicts, If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    const { error } = await this.examScheduleService.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      studentIds,
      examId,
    );

    if (error) {
      throw error;
    }

    return this.examScheduleService.create(examScheduleDto, teacherId);
  }

  async updateSchedule(
    scheduleId: number,
    examScheduleDto: ExamScheduleUpdateDto,
    teacherId: number,
  ) {
    const { startDate, endDate, studentIds } = examScheduleDto;

    const exam = await this.examRepo.findOne({
      where: {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schedules: { id: scheduleId },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam schedule not found');
    }

    // Check before creating exam to avoid conflicts, If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    const { error } = await this.examScheduleService.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      studentIds,
      exam.id,
      scheduleId,
    );

    if (error) {
      throw error;
    }

    return await this.examScheduleService.update(
      scheduleId,
      examScheduleDto,
      teacherId,
    );
  }

  async deleteSchedule(
    scheduleId: number,
    teacherId: number,
  ): Promise<boolean> {
    // TODO soft delete if schedule has completion
    // Check if lesson has complete, if true then cancel deletion
    const exam = await this.examRepo.findOne({
      where: {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schedules: { id: scheduleId },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam schedule not found');
    }

    return this.examScheduleService.delete(scheduleId);
  }

  // STUDENT

  async getStudentExamsByStudentId(studentId: number, q?: string) {
    const currentDateTime = dayjs().toDate();

    const upcomingExamQuery = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .where('exam.status = :status', { status: RecordStatus.Published })
      .andWhere('students.id = :studentId', { studentId })
      .andWhere('schedules.startDate > :currentDateTime', { currentDateTime });

    const ongoingExamsQuery = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .leftJoinAndSelect(
        'exam.completions',
        'completions',
        'completions.student.id = :studentId',
        { studentId },
      )
      .where('exam.status = :status', { status: RecordStatus.Published })
      .andWhere('students.id = :studentId', { studentId })
      .andWhere(
        new Brackets((sqb) => {
          sqb.where('schedules.startDate <= :currentDateTime', {
            currentDateTime,
          });
          sqb.andWhere('schedules.endDate >= :currentDateTime', {
            currentDateTime,
          });
        }),
      );

    // Get upcoming and ongoing exams first to exlcude ids in other exams query
    const upcomingExam = await upcomingExamQuery
      .select([
        'exam.id',
        'exam.createdAt',
        'exam.updatedAt',
        'exam.status',
        'exam.orderNumber',
        'exam.title',
        'exam.slug',
        'exam.excerpt',
        'exam.randomizeQuestions',
        'exam.visibleQuestionsCount',
        'exam.pointsPerQuestion',
        'exam.passingPoints',
        'schedules',
      ])
      .orderBy('schedules.startDate', 'ASC')
      .getOne();

    const ongoingExams = await ongoingExamsQuery
      .select([
        'exam.id',
        'exam.createdAt',
        'exam.updatedAt',
        'exam.status',
        'exam.orderNumber',
        'exam.title',
        'exam.slug',
        'exam.excerpt',
        'exam.randomizeQuestions',
        'exam.visibleQuestionsCount',
        'exam.pointsPerQuestion',
        'exam.passingPoints',
        'schedules',
        'completions',
      ])
      .orderBy('schedules.startDate', 'ASC')
      .getMany();

    const excludeIds = [upcomingExam, ...ongoingExams]
      .filter((e) => !!e)
      .map((e) => e.id);

    const otherExamsQuery = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.schedules', 'schedules')
      .leftJoin('schedules.students', 'students')
      .leftJoinAndSelect(
        'exam.completions',
        'completions',
        'completions.student.id = :studentId',
        { studentId },
      )
      .where('exam.status = :status', { status: RecordStatus.Published })
      .andWhere('students.id = :studentId', { studentId })
      .andWhere('schedules.endDate < :currentDateTime', { currentDateTime });

    if (excludeIds.length) {
      otherExamsQuery.andWhere('exam.id NOT IN (:...excludeIds)', {
        excludeIds,
      });
    }

    if (q) {
      upcomingExamQuery.andWhere('exam.title ILIKE :q', { q });
      otherExamsQuery.andWhere('exam.title ILIKE :q', { q });
    }

    const otherExams = await otherExamsQuery
      .select([
        'exam.id',
        'exam.createdAt',
        'exam.updatedAt',
        'exam.status',
        'exam.orderNumber',
        'exam.title',
        'exam.slug',
        'exam.excerpt',
        'exam.randomizeQuestions',
        'exam.visibleQuestionsCount',
        'exam.pointsPerQuestion',
        'exam.passingPoints',
        'schedules',
        'completions',
      ])
      .orderBy('exam.orderNumber', 'DESC')
      .getMany();

    if (ongoingExams?.length) {
      return {
        upcomingExam,
        latestExam: null,
        previousExams: otherExams,
        ongoingExams,
      };
    } else {
      const latestExam = otherExams.length ? otherExams[0] : null;
      const previousExams = otherExams.length > 1 ? otherExams.slice(1) : [];

      return {
        upcomingExam,
        latestExam,
        previousExams,
        ongoingExams,
      };
    }
  }

  async getAllByStudentId(studentId: number): Promise<Exam[]> {
    const exams = await this.examRepo.find({
      where: [
        {
          status: RecordStatus.Published,
          schedules: { students: { id: studentId } },
        },
      ],
      relations: {
        schedules: { students: true },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    const transformedExams = exams.map((exam) => {
      const schedules = exam.schedules.filter((schedule) =>
        schedule.students.some((s) => s.id === studentId),
      );

      return {
        ...exam,
        schedules,
      };
    });

    return transformedExams;
  }

  async getOneBySlugAndStudentId(
    slug: string,
    studentId: number,
    noSchedules?: boolean,
  ) {
    const currentDateTime = dayjs();

    const teacher = await this.userService.getTeacherByStudentId(studentId);

    const exam = await this.examRepo.findOne({
      where: [
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: studentId } },
        },
      ],
      relations: {
        coveredLessons: true,
        questions: { choices: true },
        schedules: { students: true },
        completions: {
          questionAnswers: { question: true, selectedQuestionChoice: true },
        },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    if (!exam || !teacher) {
      throw new NotFoundException('Exam not found');
    }

    if (noSchedules) {
      return exam;
    }

    const filteredSchedules = exam.schedules.filter((schedule) =>
      schedule.students.find((s) => s.id === studentId),
    );

    const ongoingDate = filteredSchedules.find((schedule) => {
      const startDate = dayjs(schedule.startDate);
      const endDate = dayjs(schedule.endDate);
      return currentDateTime.isBetween(startDate, endDate, null, '[]');
    });

    const transformedExam = {
      ...exam,
      completions: exam.completions.length ? [exam.completions[0]] : [],
    };

    // If exam is ongoing for current student then remove answers from completion
    if (ongoingDate) {
      const { questions, completions, ...moreExam } = transformedExam;
      const targetQuestions = moreExam.randomizeQuestions
        ? shuffleArray(questions)
        : questions;

      return {
        ...moreExam,
        questions: targetQuestions,
        completions: completions.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ questionAnswers, ...moreCompletion }) => moreCompletion,
        ),
        schedules: [ongoingDate],
        scheduleStatus: ExamScheduleStatus.Ongoing,
      };
    }

    const currentAvailableExams =
      await this.getStudentExamsByStudentId(studentId);

    const upcomingDate = filteredSchedules.find((schedule) => {
      const startDate = dayjs(schedule.startDate);
      return startDate.isAfter(currentDateTime);
    });

    // If exam is upcoming for current student then remove questions and answers from completion
    if (upcomingDate && currentAvailableExams.upcomingExam.id === exam.id) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { questions, completions, ...moreExam } = transformedExam;
      return {
        ...moreExam,
        completions: completions.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ questionAnswers, ...moreCompletion }) => moreCompletion,
        ),
        schedules: [upcomingDate],
        scheduleStatus: ExamScheduleStatus.Upcoming,
      };
    }

    // Get current student rank if exam is not ongoing or upcoming
    const studentRankings = await this.generateExamRankings(exam, teacher.id);

    const { rank } = studentRankings.find(
      (data) => data.studentId === studentId,
    );

    return {
      ...transformedExam,
      scheduleStatus: ExamScheduleStatus.Past,
      rank,
    };
  }

  async createExamCompletionBySlugAndStudentId(
    body: ExamCompletionCreateDto,
    slug: string,
    studentId: number,
  ) {
    const { questionAnswers } = body;
    const currentDateTime = dayjs();

    const exam = await this.examRepo.findOne({
      where: {
        slug,
        status: RecordStatus.Published,
        schedules: { students: { id: studentId } },
      },
      relations: { schedules: true, completions: true },
    });

    if (
      !exam ||
      (exam.schedules?.length &&
        dayjs(exam.schedules[0].startDate).isAfter(currentDateTime))
    ) {
      throw new NotFoundException('Exam not available');
    }

    const completions = await this.examCompletionRepo.find({
      where: { exam: { id: exam.id }, student: { id: studentId } },
    });

    if (completions.length) {
      throw new BadRequestException('Exam already taken');
    }

    const examQuestions = await this.examQuestionRepo.find({
      where: {
        id: In(questionAnswers.map((a) => a.questionId)),
        exam: { id: exam.id },
      },
      relations: { choices: true },
    });

    const correctCount = questionAnswers.reduce(
      (acc, { questionId, selectedQuestionChoiceId }) => {
        if (!questionId || !selectedQuestionChoiceId) {
          return acc;
        }

        const question = examQuestions.find((q) => q.id === questionId);
        const choice = question
          ? question.choices.find((c) => c.id === selectedQuestionChoiceId)
          : null;

        return choice.isCorrect ? acc + 1 : acc;
      },
      0,
    );

    const score = correctCount * exam.pointsPerQuestion;

    const newQuestionAnswers = questionAnswers.map(
      ({ questionId, selectedQuestionChoiceId }) => ({
        question: { id: questionId },
        selectedQuestionChoice: selectedQuestionChoiceId
          ? { id: selectedQuestionChoiceId }
          : null,
      }),
    );

    const completion = this.examCompletionRepo.create({
      score,
      submittedAt: currentDateTime.toDate(),
      exam,
      questionAnswers: newQuestionAnswers,
      student: { id: studentId },
    });

    return this.examCompletionRepo.save(completion);
  }

  async deleteExamCompletionBySlugAndStudentId(
    slug: string,
    studentId: number,
  ): Promise<boolean> {
    const result = await this.examCompletionRepo.delete({
      exam: { slug },
      student: { id: studentId },
    });

    return !!result.affected;
  }

  //  MISC

  async validateCreateExam(examDto: ExamCreateDto, teacherId: number) {
    const {
      startDate,
      endDate,
      studentIds,
      coveredLessonIds,
      questions,
      ...moreExamDto
    } = examDto;

    // Check if passing points is more than the exam's total points
    if (
      moreExamDto.passingPoints >
      moreExamDto.pointsPerQuestion * moreExamDto.visibleQuestionsCount
    ) {
      throw new BadRequestException('Passing points is more that total points');
    }

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

    this.validateExamQuestion(questions);

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons = await this.lessonService.getTeacherLessonsByTeacherId(
        teacherId,
        undefined,
        coveredLessonIds,
        undefined,
        RecordStatus.Published,
        true,
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
  }

  async validateUpdateExam(
    examDto: ExamUpdateDto,
    slug: string,
    exam: Exam,
    teacherId: number,
    scheduleId?: number,
  ) {
    const {
      startDate,
      endDate,
      studentIds,
      coveredLessonIds,
      questions,
      ...moreExamDto
    } = examDto;

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if passing points is more than the exam's total points
    if (
      moreExamDto.passingPoints >
      moreExamDto.pointsPerQuestion * moreExamDto.visibleQuestionsCount
    ) {
      throw new BadRequestException('Passing points is more that total points');
    }

    // Check if someone has already completed exam, if true then cancel update
    const completionCount = await this.examCompletionRepo.count({
      where: { exam: { id: exam.id } },
    });

    if (completionCount > 0) {
      throw new BadRequestException(
        'Cannot update exams that are already taken',
      );
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

    this.validateExamQuestion(questions);

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons = await this.lessonService.getTeacherLessonsByTeacherId(
        teacherId,
        undefined,
        coveredLessonIds,
        undefined,
        RecordStatus.Published,
        true,
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
  }

  async generateExamRankings(exam: Exam, teacherId: number) {
    const students = await this.userService.getStudentsByTeacherId(teacherId);

    const studentIds = students.map((student) => student.id);

    const completions = await this.examCompletionRepo.find({
      where: { exam: { id: exam.id }, student: { id: In(studentIds) } },
      relations: { student: true },
      order: { submittedAt: 'DESC' },
    });

    // Assign completions
    const studentData = studentIds.map((studentId) => {
      const completion = completions.find(
        (com) => com.student.id === studentId,
      );
      return {
        studentId,
        completions: completion ? [completion] : [],
      };
    });

    const completeStudentData = studentData
      .filter((data) => !!data.completions.length)
      .sort(
        (dataA, dataB) =>
          dataB.completions[0].score - dataA.completions[0].score,
      )
      .map((data, index) => ({ ...data, rank: index + 1 }));

    const incompleteStudentData = studentData
      .filter((data) => !data.completions.length)
      .map((data) => ({ ...data, rank: null }));

    return [...completeStudentData, ...incompleteStudentData];
  }
}
