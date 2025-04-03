import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';

import { ActivityService } from '#/modules/activity/activity.service';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { LessonService } from '#/modules/lesson/lesson.service';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { ExamResponse } from '#/modules/exam/models/exam.model';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';
import { TeacherExamService } from '#/modules/exam/services/teacher-exam.service';
import { PerformanceService } from './performance.service';
import { StudentPerformance } from '../models/performance.model';

@Injectable()
export class StudentPerformanceService {
  constructor(
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(PerformanceService)
    private readonly performanceService: PerformanceService,
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(TeacherExamService)
    private readonly teacherExamService: TeacherExamService,
    @Inject(StudentExamService)
    private readonly studentExamService: StudentExamService,
    @Inject(ActivityService)
    private readonly activityService: ActivityService,
  ) {}

  async getStudentPerformanceByStudentId(
    studentId: number,
  ): Promise<Partial<StudentPerformance>> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
      loadEagerRelations: false,
      relations: {
        user: true,
        teacherUser: true,
        lessonCompletions: { lesson: true },
        activityCompletions: { activityCategory: { activity: true } },
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
        lessonCompletions: { lesson: true },
        activityCompletions: { activityCategory: { activity: true } },
        examCompletions: { exam: true },
      },
    });

    const examPerformance =
      await this.performanceService.generateOverallExamDetailedPerformance(
        student,
        otherStudents,
      );

    const activityPerformance =
      await this.performanceService.generateOverallActivityDetailedPerformance(
        student,
        otherStudents,
      );

    const lessonPerformance =
      await this.performanceService.generateOverallLessonDetailedPerformance(
        student,
      );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { totalLessonCount, ...moreLessonPerformance } = lessonPerformance;

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
      ...moreLessonPerformance,
    };
  }

  async getStudentLessonsByStudentId(studentId: number): Promise<Lesson[]> {
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

    return this.lessonService.getLessonsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      student.teacherUser.id,
      true,
    );
  }

  async getStudentExamsByStudentId(
    studentId: number,
  ): Promise<Partial<ExamResponse>[]> {
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

    const exams =
      await this.teacherExamService.getExamsWithCompletionsByStudentIdAndTeacherId(
        student.id,
        student.teacherUser.id,
        true,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.studentExamService.generateExamRankings(
          exam as Exam,
          student.teacherUser.id,
        );

        const { rank } = rankings.find((rank) => rank.studentId === student.id);

        return { ...exam, rank, completions: exam.completions };
      }),
    );

    return transformedExams;
  }

  async getStudentActivitiesByStudentId(
    studentId: number,
  ): Promise<Activity[]> {
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

    const activities =
      await this.activityService.getActivitiesWithCompletionsByStudentIdAndTeacherId(
        student.id,
        student.teacherUser.id,
      );

    const transformedActivities = Promise.all(
      activities.map(async (activity) => {
        const rankings = await this.activityService.generateActivityRankings(
          activity,
          student.teacherUser.id,
        );

        const { rank, completions } = rankings.find(
          (rank) => rank.studentId === student.id,
        );

        return { ...activity, rank, completions };
      }),
    );

    return transformedActivities;
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

    const exam = await this.studentExamService.getOneBySlugAndStudentId(
      slug,
      student.id,
    );

    // Remove questions and answers from completion if current exam is ongoing
    if (exam.schedules.length) {
      const isNotDone = exam.schedules.some((schedule) => {
        const currentDate = dayjs();
        const startDate = dayjs(schedule.startDate);
        const endDate = dayjs(schedule.endDate);

        return (
          startDate.isAfter(currentDate) ||
          currentDate.isBetween(startDate, endDate, null, '[]')
        );
      });

      if (isNotDone) {
        exam.completions = exam.completions.map((com) => ({
          ...com,
          questionAnswers: [],
        }));
      }
    }

    return exam as Exam;
  }

  async getStudentActivityWithCompletionsBySlugAndStudentId(
    slug: string,
    studentId: number,
  ): Promise<Activity> {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.activityService.getOneBySlugAndStudentId(
      slug,
      student.id,
    ) as Promise<Activity>;
  }
}
