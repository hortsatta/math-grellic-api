import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelations,
  FindOptionsWhere,
  ILike,
  Not,
  Repository,
} from 'typeorm';
import dayjs from 'dayjs';

import { ExamService } from '../exam/exam.service';
import { generateFullName } from '#/common/helpers/string.helper';
import { StudentUserAccount } from '../user/entities/student-user-account.entity';
import { UserApprovalStatus } from '../user/enums/user.enum';
import { Exam } from '../exam/entities/exam.entity';
import { StudentPerformance } from './models/performance.model';
import { StudentPerformanceType } from './enums/performance.enum';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(ExamService)
    private readonly examService: ExamService,
  ) {}

  async generateActivityPerformance(
    student: StudentUserAccount,
    otherStudents: StudentUserAccount[],
  ) {
    // TODO
    // Get activity rank + score

    let overallActivityRank = undefined;
    let overallActivityScore = null;
    let totalActivityCount = undefined;
    let activitiesCompletedCount = undefined;
    let overallActivityCompletionPercent = undefined;

    return {
      overallActivityRank,
      overallActivityScore,
      totalActivityCount,
      activitiesCompletedCount,
      overallActivityCompletionPercent,
    };
  }

  async generateExamPerformance(
    student: StudentUserAccount,
    otherStudents: StudentUserAccount[],
  ) {
    const allExams = await this.examService.getAllByStudentId(student.id);

    const availableExams = allExams.filter((exam) => {
      const currentDateTime = dayjs().toDate();
      const isAvailable = exam.schedules.some(
        (schedule) =>
          dayjs(schedule.startDate).isBefore(currentDateTime) ||
          dayjs(schedule.startDate).isSame(currentDateTime),
      );

      return isAvailable;
    });

    const examCompletions = student.examCompletions.filter(
      (ec, index, self) =>
        index === self.findIndex((t) => t.exam.id === ec.exam.id),
    );

    const examsPassedCount = examCompletions.filter(
      (ec) => ec.score >= ec.exam.passingPoints,
    ).length;

    const examsFailedCount = examCompletions.filter(
      (ec) => ec.score < ec.exam.passingPoints,
    ).length;

    const examsExpiredCount = availableExams.filter(
      (exam) => !examCompletions.find((ec) => ec.exam.id === exam.id),
    ).length;

    const overallExamCompletionPercent = (() => {
      const value = (availableExams.length / allExams.length) * 100;
      return +value.toFixed(2);
    })();

    let overallExamRank = undefined;
    let overallExamScore = null;

    // Get exam rank + score
    if (student.examCompletions?.length) {
      overallExamScore = student.examCompletions.reduce(
        (total, currentValue) => currentValue.score + total,
        0,
      );

      const scores = otherStudents
        .filter((s) => s.examCompletions?.length)
        .map((s) =>
          s.examCompletions.reduce(
            (total, currentValue) => currentValue.score + total,
            0,
          ),
        )
        .filter((score) => score !== overallExamScore);

      const scoreIndex = [...scores, overallExamScore]
        .sort((a, b) => a.overallExamScore - b.overallExamScore)
        .findIndex((score) => score === overallExamScore);

      if (scoreIndex >= 0) {
        overallExamRank = scoreIndex + 1;
      }
    }

    return {
      currentExamCount: availableExams.length,
      examsCompletedCount: examCompletions.length,
      examsPassedCount,
      examsFailedCount,
      examsExpiredCount,
      overallExamCompletionPercent,
      overallExamRank,
      overallExamScore,
    };
  }

  // TEACHERS

  async getPaginationStudentPerformancesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = 10,
    skip: number = 0,
    q?: string,
    performance = StudentPerformanceType.Exam,
  ): Promise<[StudentPerformance[], number]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = {
        teacherUser: { id: teacherId },
        user: { approvalStatus: UserApprovalStatus.Approved },
      };

      if (!!q?.trim()) {
        return [
          { firstName: ILike(`%${q}%`), ...baseWhere },
          { lastName: ILike(`%${q}%`), ...baseWhere },
          { middleName: ILike(`%${q}%`), ...baseWhere },
        ];
      }

      return baseWhere;
    };

    // Get completion base on target performance (lesson, exam, activity)
    const generateRelations = () => {
      const baseRelations: FindOptionsRelations<StudentUserAccount> = {
        user: true,
      };

      if (performance === StudentPerformanceType.Exam) {
        return { ...baseRelations, examCompletions: true };
      } else {
        return { ...baseRelations, activityCompletions: true };
      }
    };

    const [students, studentCount] =
      await this.studentUserAccountRepo.findAndCount({
        where: generateWhere(),
        loadEagerRelations: false,
        relations: generateRelations(),
        select: {
          user: {
            publicId: true,
            email: true,
          },
        },
      });

    let transformedStudents = [];
    let previousScore = null;
    let currentRank = null;
    let rankedStudents = [];
    let unrankedStudents = [];

    if (performance === StudentPerformanceType.Exam) {
      transformedStudents = students.map((student) => {
        if (!student.examCompletions.length) {
          return { ...student, overallExamScore: null };
        }

        const overallExamScore = student.examCompletions.reduce(
          (total, currentValue) => currentValue.score + total,
          0,
        );

        return { ...student, overallExamScore };
      });

      rankedStudents = transformedStudents
        .filter((s) => s.overallExamScore != null)
        .sort((a, b) => a.overallExamScore - b.overallExamScore)
        .map((student, index) => {
          if (student.overallExamScore !== previousScore) {
            currentRank = index + 1;
          }

          previousScore = student.overallExamScore;

          return { ...student, overallExamRank: currentRank };
        });

      unrankedStudents = transformedStudents
        .filter((s) => s.overallExamScore == null)
        .sort((a, b) => {
          const aFullname = generateFullName(
            a.firstName,
            a.lastName,
            a.middleName,
          );
          const bFullname = generateFullName(
            b.firstName,
            b.lastName,
            b.middleName,
          );

          return aFullname.localeCompare(bFullname);
        });
    } else {
      // TODO activity ranking
      return [[], 0];
    }

    let targetStudents = [...rankedStudents, ...unrankedStudents];

    const [sortBy, sortOrder] = sort?.split(',') || [];

    if (sortBy === 'name') {
      targetStudents = targetStudents.sort((a, b) => {
        const aFullname = generateFullName(
          a.firstName,
          a.lastName,
          a.middleName,
        );
        const bFullname = generateFullName(
          b.firstName,
          b.lastName,
          b.middleName,
        );

        if (sortOrder === 'asc') {
          return aFullname.localeCompare(bFullname);
        } else {
          return bFullname.localeCompare(aFullname);
        }
      });
    } else if (sortBy === 'rank') {
      if (sortOrder === 'desc') {
        targetStudents = [
          ...unrankedStudents,
          ...[...rankedStudents].reverse(),
        ];
      }
    }

    // Slice array for current page
    const endIndex = skip + take;
    return [targetStudents.slice(skip, endIndex), studentCount];
  }

  async getStudentPerformanceByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
  ): Promise<StudentPerformance> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        teacherUser: { id: teacherId },
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
        },
      },
      loadEagerRelations: false,
      relations: {
        user: true,
        lessonCompletions: true,
        activityCompletions: { activityCategory: true },
        examCompletions: { exam: true },
      },
      select: {
        user: {
          publicId: true,
          email: true,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const otherStudents = await this.studentUserAccountRepo.find({
      where: {
        teacherUser: { id: teacherId },
        user: {
          publicId: Not(publicId),
          approvalStatus: UserApprovalStatus.Approved,
        },
      },
      loadEagerRelations: false,
      relations: {
        lessonCompletions: true,
        activityCompletions: true,
        examCompletions: true,
      },
    });

    const examPerformance = await this.generateExamPerformance(
      student,
      otherStudents,
    );

    const activityPerformance = await this.generateActivityPerformance(
      student,
      otherStudents,
    );

    const transformedStudent = {
      ...student,
      lessonCompletions: undefined,
      examCompletions: undefined,
      activityCompletions: undefined,
    };

    return {
      ...transformedStudent,
      ...examPerformance,
      ...activityPerformance,
    };
  }

  async getStudentExamsByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
  ): Promise<Exam[]> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        teacherUser: { id: teacherId },
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.examService.getExamsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      teacherId,
    );
  }

  async getStudentExamWithCompletionsByPublicIdAndSlug(
    publicId: string,
    slug: string,
    teacherId: number,
  ): Promise<Exam> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        teacherUser: { id: teacherId },
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.examService.getOneBySlugAndStudentId(
      slug,
      student.id,
      true,
    ) as Promise<Exam>;
  }

  // STUDENTS

  async getStudentPerformanceByStudentId(
    studentId: number,
  ): Promise<StudentPerformance> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
      loadEagerRelations: false,
      relations: {
        user: true,
        teacherUser: true,
        lessonCompletions: true,
        activityCompletions: { activityCategory: true },
        examCompletions: { exam: true },
      },
      select: {
        user: {
          publicId: true,
          email: true,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const otherStudents = await this.studentUserAccountRepo.find({
      where: {
        id: Not(student.id),
        teacherUser: { id: student.teacherUser.id },
        user: {
          approvalStatus: UserApprovalStatus.Approved,
        },
      },
      loadEagerRelations: false,
      relations: {
        lessonCompletions: true,
        activityCompletions: true,
        examCompletions: true,
      },
    });

    const examPerformance = await this.generateExamPerformance(
      student,
      otherStudents,
    );

    const activityPerformance = await this.generateActivityPerformance(
      student,
      otherStudents,
    );

    const transformedStudent = {
      ...student,
      lessonCompletions: undefined,
      examCompletions: undefined,
      activityCompletions: undefined,
    };

    return {
      ...transformedStudent,
      ...examPerformance,
      ...activityPerformance,
    };
  }

  async getStudentExamsByStudentId(studentId: number): Promise<Exam[]> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
      relations: { teacherUser: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.examService.getExamsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      student.teacherUser.id,
    );
  }

  async getStudentExamWithCompletionsBySlugAndStudentId(
    slug: string,
    studentId: number,
  ): Promise<Exam> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.examService.getOneBySlugAndStudentId(
      slug,
      student.id,
      true,
    ) as Promise<Exam>;
  }
}
