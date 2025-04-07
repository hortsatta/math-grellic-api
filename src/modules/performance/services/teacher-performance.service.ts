import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelations,
  FindOptionsWhere,
  ILike,
  Not,
  Repository,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { generateFullName } from '#/common/helpers/string.helper';
import { RecordStatus } from '#/common/enums/content.enum';
import { ActivityService } from '#/modules/activity/activity.service';
import { ActivityCategory } from '#/modules/activity/entities/activity-category.entity';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { LessonService } from '#/modules/lesson/services/lesson.service';
import { TeacherLessonService } from '#/modules/lesson/services/teacher-lesson.service';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { ExamResponse } from '#/modules/exam/models/exam.model';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';
import { TeacherExamService } from '#/modules/exam/services/teacher-exam.service';
import { StudentPerformanceType } from '../enums/performance.enum';
import { StudentPerformance } from '../models/performance.model';
import { PerformanceService } from './performance.service';

@Injectable()
export class TeacherPerformanceService {
  constructor(
    @Inject(PerformanceService)
    private readonly performanceService: PerformanceService,
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(TeacherLessonService)
    private readonly teacherLessonService: TeacherLessonService,
    @Inject(TeacherExamService)
    private readonly teacherExamService: TeacherExamService,
    @Inject(StudentExamService)
    private readonly studentExamService: StudentExamService,
    @Inject(ActivityService)
    private readonly activityService: ActivityService,
  ) {}

  async getClassPerformanceByTeacherId(teacherId: number) {
    // LESSONS
    // Get all lessons and calculate overall class lesson completion

    const { overallLessonCompletionPercent } =
      await this.getLessonPerformanceByTeacherId(teacherId);

    // EXAMS
    // Get all exams and calculate overall class exam completion

    const { overallExamCompletionPercent } =
      await this.getExamPerformanceByTeacherId(teacherId);

    // ACTIVITIES
    // Get all activities and calculate overall class activity completion

    const { overallActivityCompletionPercent } =
      await this.getActivityPerformanceByTeacherId(teacherId);

    return {
      overallLessonCompletionPercent,
      overallExamCompletionPercent,
      overallActivityCompletionPercent,
    };
  }

  async getLessonPerformanceByTeacherId(teacherId: number) {
    // Get all teacher's students (with completions)
    const allStudents = await this.studentUserAccountRepo.find({
      where: {
        teacherUser: { id: teacherId },
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
      relations: { lessonCompletions: { lesson: true } },
    });

    // LESSONS
    // Get all lessons and calculate overall class lesson completion

    const allPublishedLessons =
      await this.teacherLessonService.getTeacherLessonsByTeacherId(
        teacherId,
        undefined,
        undefined,
        undefined,
        RecordStatus.Published,
        true,
      );

    const allLessons = allPublishedLessons.filter(
      (lesson) => lesson.schedules?.length,
    );

    const totalLessonPoints = allStudents.length * allLessons.length;
    let currentLessonPoints = 0;

    allLessons.forEach((lesson) => {
      allStudents.forEach((student) => {
        const hasCompletion =
          student.lessonCompletions?.some(
            (com) => com.lesson.id === lesson.id,
          ) || false;

        if (hasCompletion) {
          currentLessonPoints += 1;
        }
      });
    });

    const overallLessonCompletionPercent =
      (currentLessonPoints / totalLessonPoints) * 100;

    const totalLessonDurationSeconds = allLessons.reduce(
      (total, lesson) => total + lesson.durationSeconds,
      0,
    );

    return {
      lessonTotalCount: allLessons.length,
      totalLessonDurationSeconds,
      overallLessonCompletionPercent,
    };
  }

  async getExamPerformanceByTeacherId(teacherId: number) {
    const currentDateTime = dayjs().toDate();

    // Get all students (with completions) of teacher
    const allStudents = await this.studentUserAccountRepo.find({
      where: {
        teacherUser: { id: teacherId },
        user: { approvalStatus: UserApprovalStatus.Approved },
      },
      relations: {
        examCompletions: { exam: true },
        examSchedules: { exam: true },
      },
    });

    const allPublishedExams =
      await this.teacherExamService.getTeacherExamsByTeacherId(
        teacherId,
        undefined,
        undefined,
        undefined,
        RecordStatus.Published,
        true,
      );

    const allExams = allPublishedExams.filter((exam) => exam.schedules?.length);

    let totalExamCompletionPoints = 0;
    let currentExamCompletionPoints = 0;

    // Get total completions points and current completion points
    allExams.forEach((exam) => {
      allStudents.forEach((student) => {
        const schedules = student.examSchedules.filter(
          (schedule) => schedule.exam.id === exam.id,
        );

        const upcomingExamIds = schedules
          .filter((schedule) =>
            dayjs(schedule.startDate).isAfter(currentDateTime),
          )
          .map((schedule) => schedule.exam.id);

        const completions = student.examCompletions.filter(
          (com) => upcomingExamIds.findIndex((id) => id === com.exam.id) < 0,
        );

        if (schedules.length) {
          totalExamCompletionPoints += 1;
        }

        if (completions.some((com) => com.exam.id === exam.id) || false) {
          currentExamCompletionPoints += 1;
        }
      });
    });

    const overallExamCompletionPercent =
      (currentExamCompletionPoints / totalExamCompletionPoints) * 100;

    const totalExamPoints = allExams.reduce(
      (total, exam) =>
        total + exam.visibleQuestionsCount * exam.pointsPerQuestion,
      0,
    );

    return {
      totalExamCount: allExams.length,
      totalExamPoints,
      overallExamCompletionPercent,
    };
  }

  async getActivityPerformanceByTeacherId(teacherId: number) {
    // Get all students (with completions) of teacher
    const students = await this.studentUserAccountRepo.find({
      where: {
        teacherUser: { id: teacherId },
        user: { approvalStatus: UserApprovalStatus.Approved },
        lessonCompletions: { lesson: true },
        examCompletions: { exam: true },
        activityCompletions: { activityCategory: true },
      },
    });

    const allActivities =
      await this.activityService.getTeacherActivitiesByTeacherId(
        teacherId,
        undefined,
        undefined,
        RecordStatus.Published,
      );

    const allActivityCategories = allActivities.reduce(
      (total, activity) => [...total, ...activity.categories],
      [],
    );

    const totalActivityPoints = students.length * allActivityCategories.length;
    let currentActivityPoints = 0;

    allActivityCategories.forEach((category: ActivityCategory) => {
      students.forEach((student) => {
        const hasCompletion =
          student.activityCompletions?.some(
            (com) => com.activityCategory.id === category.id,
          ) || false;

        if (hasCompletion) {
          currentActivityPoints += 1;
        }
      });
    });

    const overallActivityCompletionPercent = +(
      (currentActivityPoints / totalActivityPoints) *
      100
    ).toFixed(2);

    return {
      totalActivityCount: allActivities.length,
      overallActivityCompletionPercent,
    };
  }

  async getPaginationStudentPerformancesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    performance = StudentPerformanceType.Exam,
  ): Promise<[Partial<StudentPerformance>[], number]> {
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
        return { ...baseRelations, examCompletions: { exam: true } };
      } else if (performance === StudentPerformanceType.Activity) {
        return {
          ...baseRelations,
          activityCompletions: { activityCategory: { activity: true } },
        };
      } else {
        return { ...baseRelations, lessonCompletions: { lesson: true } };
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

    let rankedStudents,
      unrankedStudents = [];

    if (performance === StudentPerformanceType.Exam) {
      const examRankings =
        await this.performanceService.generateOverallExamRankings(students);

      rankedStudents = examRankings.rankedStudents;
      unrankedStudents = examRankings.unrankedStudents;
    } else if (performance === StudentPerformanceType.Activity) {
      const activityRankings =
        await this.performanceService.generateOverallActivityRankings(students);

      rankedStudents = activityRankings.rankedStudents;
      unrankedStudents = activityRankings.unrankedStudents;
    } else {
      const lessonRankings =
        await this.performanceService.generateOverallLessonRankings(students);
      rankedStudents = lessonRankings.rankedStudents;
      unrankedStudents = lessonRankings.unrankedStudents;
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
        teacherUser: { id: teacherId },
        user: {
          publicId: Not(publicId.toUpperCase()),
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
      ...lessonPerformance,
    };
  }

  async getStudentLessonsByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
  ): Promise<Lesson[]> {
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

    return this.lessonService.getLessonsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      teacherId,
    );
  }

  async getStudentExamsByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
  ): Promise<Partial<ExamResponse>[]> {
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

    const exams =
      await this.teacherExamService.getExamsWithCompletionsByStudentIdAndTeacherId(
        student.id,
        teacherId,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.studentExamService.generateExamRankings(
          exam as Exam,
          teacherId,
        );

        const { rank } = rankings.find((rank) => rank.studentId === student.id);

        return { ...exam, rank, completions: exam.completions };
      }),
    );

    return transformedExams;
  }

  async getStudentActivitiesByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
  ): Promise<Activity[]> {
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

    const activities =
      await this.activityService.getActivitiesWithCompletionsByStudentIdAndTeacherId(
        student.id,
        teacherId,
      );

    const transformedActivities = Promise.all(
      activities.map(async (activity) => {
        const rankings = await this.activityService.generateActivityRankings(
          activity,
          teacherId,
        );

        const { rank, completions } = rankings.find(
          (rank) => rank.studentId === student.id,
        );

        return { ...activity, rank, completions };
      }),
    );

    return transformedActivities;
  }

  async getStudentExamWithCompletionsByPublicIdAndSlug(
    publicId: string,
    slug: string,
    teacherId: number,
    scheduleId?: number,
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

    const exam = (await this.studentExamService.getOneBySlugAndStudentId(
      slug,
      student.id,
      false,
      true,
    )) as Exam;

    if (!scheduleId) return exam;

    return {
      ...exam,
      schedules:
        exam.schedules?.filter((schedule) => schedule.id === scheduleId) || [],
      completions: exam.completions?.filter(
        (com) => com.schedule.id === scheduleId,
      ),
    };
  }

  async getStudentActivityWithCompletionsByPublicIdAndSlug(
    publicId: string,
    slug: string,
    teacherId: number,
  ): Promise<Activity> {
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

    return this.activityService.getOneBySlugAndStudentId(
      slug,
      student.id,
    ) as Promise<Activity>;
  }
}
