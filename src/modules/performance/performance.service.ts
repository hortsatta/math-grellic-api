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
import { StudentUserAccount } from '../user/entities/student-user-account.entity';
import { UserApprovalStatus } from '../user/enums/user.enum';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Activity } from '../activity/entities/activity.entity';
import { ActivityCategory } from '../activity/entities/activity-category.entity';
import { ActivityCategoryType } from '../activity/enums/activity.enum';
import { LessonService } from '../lesson/lesson.service';
import { ExamService } from '../exam/exam.service';
import { ActivityService } from '../activity/activity.service';
import { StudentPerformance } from './models/performance.model';
import { StudentPerformanceType } from './enums/performance.enum';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(ExamService)
    private readonly examService: ExamService,
    @Inject(ActivityService)
    private readonly activityService: ActivityService,
  ) {}

  async generateOverallLessonRankings(students: StudentUserAccount[]) {
    const transformedStudents = await Promise.all(
      students.map(async (student) => {
        const lessons = await this.lessonService.getAllByStudentId(student.id);

        // Remove duplicate lesson completion
        const filteredLessonCompletions = student.lessonCompletions
          .sort(
            (comA, comB) => comB.createdAt.valueOf() - comA.createdAt.valueOf(),
          )
          .filter(
            (com, index, array) =>
              array.findIndex((item) => item.lesson.id === com.lesson.id) ===
              index,
          );

        return {
          ...student,
          lessonsCompletedCount: filteredLessonCompletions.length,
          totalLessonCount: lessons.length,
        };
      }),
    );

    const rankedStudents = transformedStudents
      .filter((s) => s.lessonsCompletedCount > 0)
      .sort((a, b) => b.lessonsCompletedCount - a.lessonsCompletedCount);

    const unrankedStudents = transformedStudents
      .filter((s) => s.lessonsCompletedCount <= 0)
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

    return { rankedStudents, unrankedStudents };
  }

  async generateOverallExamRankings(students: StudentUserAccount[]) {
    let previousScore = null;
    let currentRank = null;

    const transformedStudents = students.map((student) => {
      // Remove duplicate exam completion
      const filteredExamCompletions = student.examCompletions
        .sort(
          (comA, comB) =>
            comB.submittedAt.valueOf() - comA.submittedAt.valueOf(),
        )
        .filter(
          (com, index, array) =>
            array.findIndex((item) => item.exam.id === com.exam.id) === index,
        );

      if (!filteredExamCompletions.length) {
        return { ...student, overallExamScore: null };
      }

      // Calculate total exam scores (overall)
      const overallExamScore = filteredExamCompletions.reduce(
        (total, currentValue) => currentValue.score + total,
        0,
      );

      return { ...student, overallExamScore };
    });

    const rankedStudents = transformedStudents
      .filter((s) => s.overallExamScore != null)
      .sort((a, b) => b.overallExamScore - a.overallExamScore)
      .map((student, index) => {
        if (student.overallExamScore !== previousScore) {
          currentRank = index + 1;
        }

        previousScore = student.overallExamScore;

        return { ...student, overallExamRank: currentRank };
      });

    const unrankedStudents = transformedStudents
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
      })
      .map((s) => ({ ...s, overallExamRank: null }));

    return {
      rankedStudents,
      unrankedStudents,
    };
  }

  async generateOverallActivityRankings(students: StudentUserAccount[]) {
    let previousScore = null;
    let currentRank = null;

    const transformedStudents = students.map((student) => {
      // Remove duplicate activity completion
      const filteredActivityCompletions = student.activityCompletions
        .sort(
          (catA, catB) =>
            catB.submittedAt.valueOf() - catA.submittedAt.valueOf(),
        )
        .filter(
          (cat, index, array) =>
            array.findIndex(
              (item) => item.activityCategory.id === cat.activityCategory.id,
            ) === index,
        );

      if (!filteredActivityCompletions.length) {
        return {
          ...student,
          overallActivityScore: null,
        };
      }

      // Filter non time-based activities
      const poinLevelActivityCompletions = filteredActivityCompletions.filter(
        (com) =>
          com.activityCategory.activity.game.type !== ActivityCategoryType.Time,
      );

      // Calculate total point/level score
      const totalPointLevelScore = poinLevelActivityCompletions.reduce(
        (total, com) => (com.score || 0) + total,
        0,
      );

      // Filter time-based activities
      const timeActivityCompletions = filteredActivityCompletions.filter(
        (com) =>
          com.activityCategory.activity.game.type === ActivityCategoryType.Time,
      );

      const timeActivityIds = timeActivityCompletions
        .map((com) => com.activityCategory.activity.id)
        .filter((id, index, array) => array.indexOf(id) === index);

      const totalTimeScore = timeActivityIds
        .map((activityId) => {
          const targetCompletions = timeActivityCompletions.filter(
            (com) => com.activityCategory.activity.id === activityId,
          );

          // Remove duplicate
          const filteredTargetCompletions = targetCompletions.filter(
            (com, index, array) =>
              array.findIndex(
                (item) =>
                  item.activityCategory.level === com.activityCategory.level,
              ) === index,
          );

          if (filteredTargetCompletions.length === 3) {
            const time = filteredTargetCompletions.reduce(
              (total, com) => (com.score || 0) + total,
              0,
            );
            return time / 3;
          }

          return null;
        })
        .filter((avgTime) => !!avgTime)
        .reduce((total, avgTime) => total + 1 / avgTime, 0);

      const overallActivityScore = totalPointLevelScore + totalTimeScore;

      return { ...student, overallActivityScore, overallActivityRank: null };
    });

    const rankedStudents = transformedStudents
      .filter((s) => s.overallActivityScore != null)
      .sort((a, b) => b.overallActivityScore - a.overallActivityScore)
      .map((student, index) => {
        if (student.overallActivityScore !== previousScore) {
          currentRank = index + 1;
        }

        previousScore = student.overallActivityScore;

        return { ...student, overallActivityRank: currentRank };
      });

    const unrankedStudents = transformedStudents
      .filter((s) => s.overallActivityScore == null)
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
      })
      .map((s) => ({ ...s, overallActivityRank: null }));

    return { rankedStudents, unrankedStudents };
  }

  async generateOverallLessonDetailedPerformance(student: StudentUserAccount) {
    const allLessons = await this.lessonService.getAllByStudentId(student.id);

    const availableLessons = allLessons.filter((lesson) => {
      const currentDateTime = dayjs().toDate();
      const isAvailable = lesson.schedules.some(
        (schedule) =>
          dayjs(schedule.startDate).isBefore(currentDateTime) ||
          dayjs(schedule.startDate).isSame(currentDateTime),
      );

      return isAvailable;
    });

    const lessonCompletions = student.lessonCompletions.filter(
      (ec, index, self) =>
        index === self.findIndex((t) => t.lesson.id === ec.lesson.id),
    );

    const overallLessonCompletionPercent = (() => {
      const value = (lessonCompletions.length / allLessons.length) * 100;
      return +value.toFixed(2);
    })();

    return {
      totalLessonCount: allLessons.length,
      currentLessonCount: availableLessons.length,
      lessonsCompletedCount: lessonCompletions.length,
      overallLessonCompletionPercent,
    };
  }

  async generateOverallExamDetailedPerformance(
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

    const { rankedStudents, unrankedStudents } =
      await this.generateOverallExamRankings([student, ...otherStudents]);

    const { overallExamRank, overallExamScore } = [
      ...rankedStudents,
      ...unrankedStudents,
    ].find((s) => s.id === student.id);

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

  async generateOverallActivityDetailedPerformance(
    student: StudentUserAccount,
    otherStudents: StudentUserAccount[],
  ) {
    const allActivities = await this.activityService.getAllByStudentId(
      student.id,
    );

    const sortedCompletions = student.activityCompletions.sort(
      (comA, comB) => comB.submittedAt.valueOf() - comA.submittedAt.valueOf(),
    );

    const { rankedStudents, unrankedStudents } =
      await this.generateOverallActivityRankings([student, ...otherStudents]);

    const { overallActivityScore, overallActivityRank } = [
      ...rankedStudents,
      ...unrankedStudents,
    ].find((s) => s.id === student.id);

    // Calculate completed activity in percent
    const overallActivityCompletionPercent = (() => {
      const categoryCount = allActivities.reduce(
        (total, activity) => total + activity.categories.length,
        0,
      );

      const categoryCompletionCount = sortedCompletions.filter(
        (com, index, array) =>
          array.findIndex(
            (item) => item.activityCategory.id === com.activityCategory.id,
          ) === index,
      ).length;

      const value = (categoryCompletionCount / categoryCount) * 100;
      return +value.toFixed(2);
    })();

    let activitiesCompletedCount = 0;
    // Count activities completed,
    // for time or point game type. count as done if all three levels are completed
    allActivities.forEach((activity) => {
      const completions = sortedCompletions
        .filter((com) =>
          activity.categories.some((cat) => cat.id === com.activityCategory.id),
        )
        .filter(
          (com, index, array) =>
            array.findIndex(
              (item) =>
                item.activityCategory.level === com.activityCategory.level,
            ) === index,
        );

      if (!completions.length) {
        return;
      }

      if (activity.game.type === ActivityCategoryType.Stage) {
        activitiesCompletedCount += 1;
      } else {
        if (completions.length === 3) {
          activitiesCompletedCount += 1;
        }
      }
    });

    return {
      overallActivityRank,
      overallActivityScore,
      totalActivityCount: allActivities.length,
      activitiesCompletedCount,
      overallActivityCompletionPercent,
    };
  }

  // TEACHERS

  async getClassPerformanceByTeacherId(teacherId: number) {
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

    // LESSONS
    // Get all lessons and calculate overall class lesson completion

    const allLessons = await this.lessonService.getTeacherLessonsByTeacherId(
      teacherId,
      undefined,
      undefined,
      undefined,
      RecordStatus.Published,
      true,
    );

    const availableLessons = allLessons.filter(
      (lesson) => lesson.schedules?.length,
    );

    const totalLessonPoints = students.length * availableLessons.length;
    let currentLessonPoints = 0;

    availableLessons.forEach((lesson) => {
      students.forEach((student) => {
        const hasCompletion =
          student.lessonCompletions?.some(
            (com) => com.lesson.id === lesson.id,
          ) || false;

        if (hasCompletion) {
          currentLessonPoints += 1;
        }
      });
    });

    const overallLessonCompletionPercent = +(
      (currentLessonPoints / totalLessonPoints) *
      100
    ).toFixed(2);

    // EXAMS
    // Get all exams and calculate overall class exam completion

    const allExams = await this.examService.getTeacherExamsByTeacherId(
      teacherId,
      undefined,
      undefined,
      undefined,
      RecordStatus.Published,
      true,
    );

    const availableExams = allExams.filter((exam) => exam.schedules?.length);

    const totalExamPoints = students.length * availableExams.length;
    let currentExamPoints = 0;

    availableExams.forEach((exam) => {
      students.forEach((student) => {
        const hasCompletion =
          student.examCompletions?.some((com) => com.exam.id === exam.id) ||
          false;

        if (hasCompletion) {
          currentExamPoints += 1;
        }
      });
    });

    const overallExamCompletionPercent = +(
      (currentExamPoints / totalExamPoints) *
      100
    ).toFixed(2);

    // ACTIVITIES
    // Get all activities and calculate overall class activity completion

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
      overallLessonCompletionPercent,
      overallExamCompletionPercent,
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
      const examRankings = await this.generateOverallExamRankings(students);

      rankedStudents = examRankings.rankedStudents;
      unrankedStudents = examRankings.unrankedStudents;
    } else if (performance === StudentPerformanceType.Activity) {
      const activityRankings =
        await this.generateOverallActivityRankings(students);

      rankedStudents = activityRankings.rankedStudents;
      unrankedStudents = activityRankings.unrankedStudents;
    } else {
      const lessonRankings = await this.generateOverallLessonRankings(students);
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

    const examPerformance = await this.generateOverallExamDetailedPerformance(
      student,
      otherStudents,
    );

    const activityPerformance =
      await this.generateOverallActivityDetailedPerformance(
        student,
        otherStudents,
      );

    const lessonPerformance =
      await this.generateOverallLessonDetailedPerformance(student);

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

    const exams =
      await this.examService.getExamsWithCompletionsByStudentIdAndTeacherId(
        student.id,
        teacherId,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.examService.generateExamRankings(
          exam,
          teacherId,
        );

        const { rank, completions } = rankings.find(
          (rank) => rank.studentId === student.id,
        );

        return { ...exam, rank, completions };
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

  // STUDENTS

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
        lessonCompletions: { lesson: true },
        activityCompletions: { activityCategory: { activity: true } },
        examCompletions: true,
      },
    });

    const examPerformance = await this.generateOverallExamDetailedPerformance(
      student,
      otherStudents,
    );

    const activityPerformance =
      await this.generateOverallActivityDetailedPerformance(
        student,
        otherStudents,
      );

    const lessonPerformance =
      await this.generateOverallLessonDetailedPerformance(student);

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

    const exams =
      await this.examService.getExamsWithCompletionsByStudentIdAndTeacherId(
        student.id,
        student.teacherUser.id,
        true,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.examService.generateExamRankings(
          exam,
          student.teacherUser.id,
        );

        const { rank, completions } = rankings.find(
          (rank) => rank.studentId === student.id,
        );

        return { ...exam, rank, completions };
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

    return this.examService.getOneBySlugAndStudentId(
      slug,
      student.id,
      true,
    ) as Promise<Exam>;
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
