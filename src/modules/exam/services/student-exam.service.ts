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
import { ExamResponse } from '../models/exam.model';

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
      .leftJoinAndSelect('completions.schedule', 'completionSchedule')
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
        'completions.id',
        'completions.updatedAt',
        'completions.createdAt',
        'completions.score',
        'completions.schedule',
        'completionSchedule.id',
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
      .leftJoinAndSelect('completions.schedule', 'completionSchedule')
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
        'completions.id',
        'completions.updatedAt',
        'completions.createdAt',
        'completions.score',
        'completions.schedule',
        'completionSchedule.id',
      ])
      .orderBy('exam.orderNumber', 'DESC')
      .getMany();

    const transformedOtherExams = otherExams.map(
      (exam: Partial<ExamResponse>) => {
        if (!exam.completions?.length) {
          return exam;
        }

        if (exam.completions.length > 1) {
          exam.completions = exam.completions.sort(
            (comA, comB) =>
              dayjs(comB.schedule.startDate).valueOf() -
              dayjs(comA.schedule.startDate).valueOf(),
          );

          const highestCompletion = exam.completions.reduce(
            (acc, com) => (com.score > (acc?.score || 0) ? com : acc),
            null,
          );

          exam.completions = exam.completions.map((com) => {
            if (com.id === highestCompletion.id) {
              return { ...com, isHighest: true };
            }

            return com;
          });
        } else {
          exam.completions[0].isHighest = true;
        }

        exam.completions[0].isRecent = true;

        return exam;
      },
    );

    if (ongoingExams?.length) {
      // Filter completion to show only from ongoing schedule
      const transformedOngoingExams = ongoingExams.map((exam, index) => ({
        ...exam,
        completions: exam.completions.filter(
          (com) => com.schedule.id === ongoingExams[index].schedules[0].id,
        ),
      }));

      return {
        upcomingExam,
        latestExam: null,
        previousExams: transformedOtherExams,
        ongoingExams: transformedOngoingExams,
      };
    } else {
      const latestExam = transformedOtherExams.length
        ? transformedOtherExams[0]
        : null;
      const previousExams =
        transformedOtherExams.length > 1 ? transformedOtherExams.slice(1) : [];

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

    const exam: Partial<ExamResponse> = await this.examRepo.findOne({
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
          schedule: true,
          student: true,
        },
      },
      order: { schedules: { startDate: 'ASC' } },
    });

    if (!exam || !teacher) {
      throw new NotFoundException('Exam not found');
    }

    const examResponse = { ...exam, highestScore: null, recentScore: null };

    const filteredSchedules = examResponse.schedules.filter((schedule) =>
      schedule.students.find((s) => s.id === studentId),
    );
    // Get recent schedule
    const recentSchedule =
      filteredSchedules
        .sort(
          (schedA, schedB) =>
            dayjs(schedB.startDate).valueOf() -
            dayjs(schedA.startDate).valueOf(),
        )
        .filter((sched) =>
          dayjs(sched.startDate).isSameOrBefore(currentDateTime),
        )[0] || null;

    // If recent schedule exist then add isRecent property of main schedule list
    if (recentSchedule) {
      filteredSchedules.forEach((schedule) => {
        if (schedule.id === recentSchedule.id) {
          schedule.isRecent = true;
        }
      });
    }

    if (examResponse.completions.length) {
      // Filter completions and that belong to current student and remove all questionAnswers
      // TODO unless explicitly specified by teacher to show
      examResponse.completions = examResponse.completions
        .filter((com) => com.student.id === studentId)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ questionAnswers, ...moreCom }) => moreCom);

      // If completions is more than 1 then sort by recent
      // and set completion with highest and recent scores
      if (examResponse.completions.length > 1) {
        examResponse.completions = examResponse.completions.sort(
          (comA, comB) =>
            dayjs(comB.schedule.startDate).valueOf() -
            dayjs(comA.schedule.startDate).valueOf(),
        );

        const highestCompletion = examResponse.completions.reduce(
          (acc, com) => (com.score > (acc?.score || 0) ? com : acc),
          null,
        );

        examResponse.completions.forEach((com) => {
          if (com.id === highestCompletion.id) {
            com.isHighest = true;
          }
        });
      } else {
        examResponse.completions[0].isHighest = true;
      }

      // Get recent schedule and match, if completion schedule is same as recent schedule
      // then set completion as recent else student's recent schedule is either
      // ongoing or expired
      if (recentSchedule?.id === examResponse.completions[0].schedule.id) {
        examResponse.completions[0].isRecent = true;
      }
    }

    if (noSchedules) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { schedules, ...moreExam } = examResponse;
      return moreExam as Partial<ExamResponse>;
    }

    const ongoingDate = filteredSchedules.find((schedule) => {
      const startDate = dayjs(schedule.startDate);
      const endDate = dayjs(schedule.endDate);
      return currentDateTime.isBetween(startDate, endDate, null, '[]');
    });

    // If exam is ongoing for current student then remove answers from completion
    if (ongoingDate) {
      const { questions, ...moreExam } = examResponse;
      const targetQuestions = moreExam.randomizeQuestions
        ? shuffleArray(questions)
        : questions;

      return {
        ...moreExam,
        questions: targetQuestions,
        schedules: [ongoingDate],
        scheduleStatus: ExamScheduleStatus.Ongoing,
      };
    }

    const currentAvailableExams =
      await this.getStudentExamsByStudentId(studentId);

    const upcomingDate = filteredSchedules.find((schedule) =>
      dayjs(schedule.startDate).isAfter(currentDateTime),
    );

    // If exam is upcoming for current student then remove questions and answers from completion
    if (
      upcomingDate &&
      currentAvailableExams.upcomingExam.id === examResponse.id
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { questions, completions, ...moreExam } = examResponse;
      return {
        ...moreExam,
        schedules: [upcomingDate],
        scheduleStatus: ExamScheduleStatus.Upcoming,
      };
    }

    // Get current student rank if exam is not ongoing or upcoming
    const studentRankings = await this.generateExamRankings(
      exam as Exam,
      teacher.id,
    );

    const { rank } = studentRankings.find(
      (data) => data.studentId === studentId,
    );

    return {
      ...examResponse,
      scheduleStatus: ExamScheduleStatus.Past,
      rank,
    };
  }

  async createExamCompletionBySlugAndStudentId(
    body: ExamCompletionCreateDto,
    slug: string,
    studentId: number,
  ) {
    const { questionAnswers, scheduleId } = body;
    const currentDateTime = dayjs();

    const exam = await this.examRepo.findOne({
      where: {
        slug,
        status: RecordStatus.Published,
        schedules: { id: scheduleId, students: { id: studentId } },
      },
      relations: {
        schedules: {
          students: true,
          completions: { student: true, schedule: true },
        },
      },
    });

    if (!exam) throw new NotFoundException('Exam not available');

    // Get and check target schedule if present and has completions
    const targetSchedule = exam.schedules.find(
      (schedule) =>
        schedule.id === scheduleId &&
        schedule.students.some((stu) => stu.id === studentId),
    );

    const hasCompletion = targetSchedule?.completions.some(
      (com) => com.student.id === studentId,
    );

    // If no schedule, schedule date is future,
    // or exam already taken with this schedule then throw error
    if (
      !targetSchedule ||
      dayjs(targetSchedule.startDate).isAfter(currentDateTime)
    ) {
      throw new NotFoundException('Exam not available');
    } else if (hasCompletion) {
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
      schedule: { id: scheduleId },
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
      relations: { student: true, schedule: true },
      order: { submittedAt: 'DESC' },
    });

    // Assign completions
    const studentData = studentIds.map((studentId) => {
      const completion = completions
        .filter((com) => com.student.id === studentId)
        .reduce(
          (acc, com) => (com.score > (acc?.score || 0) ? com : acc),
          null,
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
