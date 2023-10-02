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
import { ExamQuestionChoice } from './entities/exam-question-choice.entity';
import { ExamCompletion } from './entities/exam-completion.entity';
import { ExamCreateDto } from './dtos/exam-create.dto';
import { ExamUpdateDto } from './dtos/exam-update.dto';
import { ExamQuestionUpdateDto } from './dtos/exam-question-update.dto';
import { ExamScheduleService } from './exam-schedule.service';

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

    console.log(exam.questions.map((q) => q.choices));

    return exam;
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
    // Check if passing points is more than the exam's total points
    if (
      moreExamDto.passingPoints >
      moreExamDto.pointsPerQuestion * moreExamDto.visibleQuestionsCount
    ) {
      throw new BadRequestException('Passing points is more that total points');
    }

    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
      relations: { questions: { choices: true } },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
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

    // Check if all questions have atleast one isCorrect choice
    questions.forEach((question) => {
      const hasCorrectChoice = question.choices.some(
        (choice) => choice.isCorrect,
      );

      if (!hasCorrectChoice) {
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
      console.log(
        updatedExam.questions.map((q) => ({ or: q.orderNumber, q: q.text })),
      );
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

  async deleteBySlug(slug: string, teacherId: number): Promise<boolean> {
    const exam = await this.getOneBySlugAndTeacherId(slug, teacherId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Abort if lesson had completions
    const hasCompletion = !!(await this.examCompletionRepo.count({
      where: { exam: { id: exam.id } },
    }));
    if (hasCompletion) {
      throw new BadRequestException('Cannot delete lesson');
    }

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
}

//   async upsertExamQuestions(
//     questions: ExamQuestionUpdateDto[],
//     exam: Exam,
//   ): Promise<ExamQuestion[]> {
//     const questionIds = questions.filter((q) => !!q.id).map((q) => q.id);
//     const questionsToCreate = questions.filter((q) => !q.id);

//     // Delete questions not included in update
//     const questionsToDelete = exam.questions.filter(
//       (q) => !questionIds.includes(q.id),
//     );
//     await this.examQuestionRepo.remove(questionsToDelete);

//     // Update existing questions and choices
//     const questionsToUpdate = exam.questions.filter((q) =>
//       questionIds.includes(q.id),
//     );
//     const updatedQuestions = await Promise.all(
//       questionsToUpdate.map(async (q) => {
//         const { choices: newChoices, ...moreNewData } = questions.find(
//           (question) => question.id === q.id,
//         );
//         const updatedChoices = await this.upsertExamQuestionChoices(
//           newChoices,
//           q,
//         );

//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         const { choices: _, ...moreCurrentQuestion } = q;
//         const updatedQuestion = await this.examQuestionRepo.save({
//           ...moreCurrentQuestion,
//           ...moreNewData,
//           exam,
//         });

//         return { ...updatedQuestion, choices: updatedChoices };
//       }),
//     );

//     // todo questions to create
//     const newQuestions = await Promise.all(
//       questionsToCreate.map(async (q) => {
//         const question = this.examQuestionRepo.create({ ...q, exam });
//         const newQuestion = await this.examQuestionRepo.save(question);
//         return newQuestion;
//       }),
//     );

//     return [...updatedQuestions, ...newQuestions];
//   }

//   async upsertExamQuestionChoices(
//     choices: ExamQuestionChoiceUpdateDto[],
//     question: ExamQuestion,
//   ): Promise<ExamQuestionChoice[]> {
//     const choicesIds = choices.filter((c) => !!c.id).map((c) => c.id);

//     // Delete choices not included in update
//     const choicesToDelete = question.choices.filter(
//       (c) => !choicesIds.includes(c.id),
//     );
//     await this.examQuestionChoiceRepo.remove(choicesToDelete);

//     // Update existing choices
//     const choicesToUpdate = question.choices.filter((c) =>
//       choicesIds.includes(c.id),
//     );
//     const updatedChoices = await Promise.all(
//       choicesToUpdate.map(async (c) => {
//         const updatedChoice = await this.examQuestionChoiceRepo.save({
//           ...c,
//           question,
//         });

//         return updatedChoice;
//       }),
//     );

//     // Create new choices
//     const choicesToCreate = choices.filter((q) => !q.id);
//     const newChoices = await Promise.all(
//       choicesToCreate.map(async (c) => {
//         const choice = this.examQuestionChoiceRepo.create({ ...c, question });
//         const newChoice = await this.examQuestionChoiceRepo.save(choice);
//         return newChoice;
//       }),
//     );

//     return [...updatedChoices, ...newChoices];
//   }
// }
