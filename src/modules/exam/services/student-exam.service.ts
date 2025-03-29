import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { shuffleArray } from '#/common/helpers/array.helper';
import { ExamScheduleStatus, RecordStatus } from '#/common/enums/content.enum';
import { UserService } from '#/modules/user/user.service';
import { Exam } from '../entities/exam.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamCompletion } from '../entities/exam-completion.entity';
import { ExamCompletionCreateDto } from '../dtos/exam-completion-create.dto';

@Injectable()
export class StudentExamService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamCompletion)
    private readonly examCompletionRepo: Repository<ExamCompletion>,
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

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
        completions: { student: true },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    const transformedExams = exams.map((exam) => {
      const schedules = exam.schedules.filter((schedule) =>
        schedule.students.some((s) => {
          return s.id === studentId;
        }),
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
          student: true,
        },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    if (!exam || !teacher) {
      throw new NotFoundException('Exam not found');
    }

    // Filter completions that belong to current student
    if (exam.completions.length) {
      exam.completions = exam.completions.filter(
        (com) => com.student.id === studentId,
      );
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
