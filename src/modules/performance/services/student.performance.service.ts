import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';

import { ActivityService } from '#/modules/activity/services/activity.service';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { LessonService } from '#/modules/lesson/services/lesson.service';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { SchoolYearEnrollmentApprovalStatus } from '#/modules/school-year/enums/school-year-enrollment.enum';
import { ExamResponse } from '#/modules/exam/models/exam.model';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';
import { TeacherExamService } from '#/modules/exam/services/teacher-exam.service';
import { StudentPerformance } from '../models/performance.model';
import { PerformanceService } from './performance.service';

@Injectable()
export class StudentPerformanceService {
  constructor(
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(PerformanceService)
    private readonly performanceService: PerformanceService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
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
    schoolYearId?: number,
  ): Promise<Partial<StudentPerformance>> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      loadEagerRelations: false,
      relations: {
        user: { enrollments: { teacherUser: true } },
        lessonCompletions: { lesson: { schoolYear: true } },
        activityCompletions: {
          activityCategory: { activity: { schoolYear: true } },
        },
        examCompletions: { exam: { schoolYear: true } },
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
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            teacherUser: { id: student.user.enrollments[0].teacherUser.id },
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      loadEagerRelations: false,
      relations: {
        lessonCompletions: { lesson: { schoolYear: true } },
        activityCompletions: {
          activityCategory: { activity: { schoolYear: true } },
        },
        examCompletions: { exam: { schoolYear: true } },
      },
    });

    // Get completions from target school year only
    const filteredStudent: StudentUserAccount = {
      ...student,
      lessonCompletions: student.lessonCompletions.filter(
        (com) => com.lesson.schoolYear.id === schoolYear.id,
      ),
      examCompletions: student.examCompletions.filter(
        (com) => com.exam.schoolYear.id === schoolYear.id,
      ),
      activityCompletions: student.activityCompletions.filter(
        (com) => com.activityCategory.activity.schoolYear.id === schoolYear.id,
      ),
    };

    const filteredOtherStudents: StudentUserAccount[] = otherStudents.map(
      (student) => {
        const lessonCompletions = student.lessonCompletions.filter(
          (com) => com.lesson.schoolYear.id === schoolYear.id,
        );

        const examCompletions = student.examCompletions.filter(
          (com) => com.exam.schoolYear.id === schoolYear.id,
        );

        const activityCompletions = student.activityCompletions.filter(
          (com) =>
            com.activityCategory.activity.schoolYear.id === schoolYear.id,
        );

        return {
          ...student,
          lessonCompletions,
          examCompletions,
          activityCompletions,
        };
      },
    );

    const examPerformance =
      await this.performanceService.generateOverallExamDetailedPerformance(
        filteredStudent,
        filteredOtherStudents,
        schoolYear.id,
      );

    const activityPerformance =
      await this.performanceService.generateOverallActivityDetailedPerformance(
        filteredStudent,
        filteredOtherStudents,
        schoolYear.id,
      );

    const lessonPerformance =
      await this.performanceService.generateOverallLessonDetailedPerformance(
        filteredStudent,
        schoolYear.id,
      );

    const transformedStudent = {
      ...filteredStudent,
      lessonCompletions: undefined,
      examCompletions: undefined,
      activityCompletions: undefined,
    };

    return {
      ...transformedStudent,
      ...examPerformance,
      ...activityPerformance,
      ...lessonPerformance,
    };
  }

  async getStudentLessonsByStudentId(
    studentId: number,
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

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      relations: { user: { enrollments: { teacherUser: true } } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.lessonService.getLessonsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      student.user.enrollments[0].teacherUser.id,
      schoolYear.id,
      true,
    );
  }

  async getStudentExamsByStudentId(
    studentId: number,
    schoolYearId?: number,
  ): Promise<Partial<ExamResponse>[]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      relations: { user: { enrollments: { teacherUser: true } } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const exams =
      await this.teacherExamService.getExamsWithCompletionsByStudentIdAndTeacherId(
        student.id,
        student.user.enrollments[0].teacherUser.id,
        schoolYear.id,
        true,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.studentExamService.generateExamRankings(
          exam as Exam,
          student.user.enrollments[0].teacherUser.id,
          schoolYear.id,
        );

        const { rank } = rankings.find((rank) => rank.studentId === student.id);

        return { ...exam, rank, completions: exam.completions };
      }),
    );

    return transformedExams;
  }

  async getStudentActivitiesByStudentId(
    studentId: number,
    schoolYearId?: number,
  ): Promise<Activity[]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      relations: { user: { enrollments: { teacherUser: true } } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const activities =
      await this.activityService.getActivitiesWithCompletionsByStudentIdAndTeacherId(
        student.id,
        student.user.enrollments[0].teacherUser.id,
        schoolYear.id,
      );

    const transformedActivities = Promise.all(
      activities.map(async (activity) => {
        const rankings = await this.activityService.generateActivityRankings(
          activity,
          student.user.enrollments[0].teacherUser.id,
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
    schoolYearId?: number,
  ): Promise<Exam> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const exam =
      await this.studentExamService.getBasicOneWithCompletionsBySlugAndStudentId(
        slug,
        student.id,
        schoolYear.id,
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
    schoolYearId?: number,
  ): Promise<Activity> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.activityService.getOneBySlugAndStudentId(
      slug,
      student.id,
      schoolYear.id,
      true,
    ) as Promise<Activity>;
  }
}
