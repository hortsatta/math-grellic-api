import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import {
  SchoolYearAcademicProgress,
  SchoolYearEnrollmentApprovalStatus,
} from '#/modules/school-year/enums/school-year-enrollment.enum';
import { ExamResponse } from '#/modules/exam/models/exam.model';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { ActivityCategory } from '#/modules/activity/entities/activity-category.entity';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { SchoolYearEnrollment } from '#/modules/school-year/entities/school-year-enrollment.entity';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { LessonService } from '#/modules/lesson/services/lesson.service';
import { ActivityService } from '#/modules/activity/services/activity.service';
import { TeacherLessonService } from '#/modules/lesson/services/teacher-lesson.service';
import { TeacherActivityService } from '#/modules/activity/services/teacher-activity.service';
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
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
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
    @Inject(TeacherActivityService)
    private readonly teacherActivityService: TeacherActivityService,
  ) {}

  async getClassPerformanceByTeacherId(
    teacherId: number,
    schoolYearId?: number,
  ) {
    // LESSONS
    // Get all lessons and calculate overall class lesson completion

    const { overallLessonCompletionPercent } =
      await this.getLessonPerformanceByTeacherId(teacherId, schoolYearId);

    // EXAMS
    // Get all exams and calculate overall class exam completion

    const { overallExamCompletionPercent } =
      await this.getExamPerformanceByTeacherId(teacherId, schoolYearId);

    // ACTIVITIES
    // Get all activities and calculate overall class activity completion

    const { overallActivityCompletionPercent } =
      await this.getActivityPerformanceByTeacherId(teacherId, schoolYearId);

    return {
      overallLessonCompletionPercent,
      overallExamCompletionPercent,
      overallActivityCompletionPercent,
    };
  }

  async getLessonPerformanceByTeacherId(
    teacherId: number,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    // Get all teacher's students (with completions)
    const allStudents = await this.studentUserAccountRepo.find({
      where: {
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
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
        schoolYear.id,
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

  async getExamPerformanceByTeacherId(
    teacherId: number,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const currentDateTime = dayjs().toDate();

    // Get all students (with completions) of teacher
    const allStudents = await this.studentUserAccountRepo.find({
      where: {
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      relations: {
        examCompletions: { exam: true },
        examSchedules: { exam: true },
      },
    });

    const allPublishedExams =
      await this.teacherExamService.getTeacherExamsByTeacherId(
        teacherId,
        schoolYear.id,
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

  async getActivityPerformanceByTeacherId(
    teacherId: number,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    // Get all students (with completions) of teacher
    const students = await this.studentUserAccountRepo.find({
      where: {
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      relations: {
        activityCompletions: { activityCategory: true },
      },
    });

    const allActivities =
      await this.teacherActivityService.getTeacherActivitiesByTeacherId(
        teacherId,
        schoolYear.id,
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

    const overallActivityCompletionPercent =
      (currentActivityPoints / totalActivityPoints) * 100;

    return {
      activityTotalCount: allActivities.length,
      overallActivityCompletionPercent,
    };
  }

  async getPaginationStudentPerformancesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    performance = StudentPerformanceType.Exam as string,
    schoolYearId?: number,
  ): Promise<[Partial<StudentPerformance>[], number]> {
    const AP_PERF_TYPE = 'academic-progress';

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = {
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
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
        user: { enrollments: { schoolYear: true } },
      };

      if (
        performance === StudentPerformanceType.Exam ||
        performance === AP_PERF_TYPE
      ) {
        return {
          ...baseRelations,
          examCompletions: { exam: { schoolYear: true } },
        };
      } else if (performance === StudentPerformanceType.Activity) {
        return {
          ...baseRelations,
          activityCompletions: {
            activityCategory: { activity: { schoolYear: true } },
          },
        };
      } else {
        return {
          ...baseRelations,
          lessonCompletions: { lesson: { schoolYear: true } },
        };
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
            enrollments: {
              approvalStatus: true,
              approvalDate: true,
              approvalRejectedReason: true,
              academicProgress: true,
              academicProgressRemarks: true,
              schoolYear: { id: true },
            },
          },
        },
      });

    // Get completions from target school year only
    const filteredStudents: StudentUserAccount[] = students.map((student) => {
      const lessonCompletions = student.lessonCompletions?.filter(
        (com) => com.lesson.schoolYear?.id === schoolYear?.id,
      );

      const examCompletions = student.examCompletions?.filter(
        (com) => com.exam.schoolYear?.id === schoolYear?.id,
      );

      const activityCompletions = student.activityCompletions?.filter(
        (com) =>
          com.activityCategory.activity.schoolYear?.id === schoolYear?.id,
      );

      return {
        ...student,
        lessonCompletions,
        examCompletions,
        activityCompletions,
      };
    });

    let rankedStudents: any[],
      unrankedStudents = [];

    if (
      performance === StudentPerformanceType.Exam ||
      performance === AP_PERF_TYPE
    ) {
      const examRankings =
        await this.performanceService.generateOverallExamRankings(
          filteredStudents,
        );

      rankedStudents = examRankings.rankedStudents;
      unrankedStudents = examRankings.unrankedStudents;

      // If academic progress then filter enrollemt values to target school year
      if (performance === AP_PERF_TYPE) {
        rankedStudents = rankedStudents.map((student) => {
          // TODO remove question mark
          const filteredEnrollments = student.user.enrollments.filter(
            (enrollment: SchoolYearEnrollment) =>
              enrollment.schoolYear?.id === schoolYear.id,
          );

          return {
            ...student,
            user: { ...student.user, enrollments: filteredEnrollments },
          };
        });

        unrankedStudents = unrankedStudents.map((student) => {
          // TODO remove question mark
          const filteredEnrollments = student.user.enrollments.filter(
            (enrollment: SchoolYearEnrollment) =>
              enrollment.schoolYear?.id === schoolYear.id,
          );

          return {
            ...student,
            user: { ...student.user, enrollments: filteredEnrollments },
          };
        });
      }
    } else if (performance === StudentPerformanceType.Activity) {
      const activityRankings =
        await this.performanceService.generateOverallActivityRankings(
          filteredStudents,
          schoolYear.id,
        );

      rankedStudents = activityRankings.rankedStudents;
      unrankedStudents = activityRankings.unrankedStudents;
    } else {
      const lessonRankings =
        await this.performanceService.generateOverallLessonRankings(
          filteredStudents,
          schoolYear.id,
        );
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
      if (performance !== AP_PERF_TYPE) {
        if (sortOrder === 'desc') {
          targetStudents = [
            ...unrankedStudents,
            ...[...rankedStudents].reverse(),
          ];
        }
      } else {
        // For academic progress
        const passedStudents = targetStudents.filter(
          (student: any) =>
            student.user.enrollments[0]?.academicProgress ===
            SchoolYearAcademicProgress.Passed,
        );

        const failedStudents = targetStudents.filter(
          (student: any) =>
            student.user.enrollments[0]?.academicProgress ===
            SchoolYearAcademicProgress.Failed,
        );

        const ongoingStudents = targetStudents.filter(
          (student: any) =>
            student.user.enrollments[0]?.academicProgress ===
              SchoolYearAcademicProgress.Ongoing ||
            (student.user.enrollments[0] &&
              student.user.enrollments[0].academicProgress == null),
        );

        targetStudents = [
          ...passedStudents,
          ...failedStudents,
          ...ongoingStudents,
        ];

        if (sortOrder === 'desc') {
          targetStudents.reverse();
        }
      }
    }

    // Slice array for current page
    const endIndex = skip + take;
    return [targetStudents.slice(skip, endIndex), studentCount];
  }

  async getStudentPerformanceByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
    schoolYearId?: number,
  ): Promise<StudentPerformance> {
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      loadEagerRelations: false,
      relations: {
        user: { enrollments: { schoolYear: true } },
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

    // TODO remove question mark
    const filteredEnrollments = student.user.enrollments.filter(
      (enrollment) => enrollment.schoolYear?.id === schoolYear.id,
    );

    student.user.enrollments = filteredEnrollments;

    const otherStudents = await this.studentUserAccountRepo.find({
      where: {
        user: {
          publicId: Not(publicId.toUpperCase()),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
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
      lessonCompletions: student.lessonCompletions?.filter(
        (com) => com.lesson.schoolYear?.id === schoolYear?.id,
      ),
      examCompletions: student.examCompletions?.filter(
        (com) => com.exam.schoolYear?.id === schoolYear?.id,
      ),
      activityCompletions: student.activityCompletions?.filter(
        (com) =>
          com.activityCategory.activity.schoolYear?.id === schoolYear?.id,
      ),
    };

    const filteredOtherStudents: StudentUserAccount[] = otherStudents.map(
      (student) => {
        const lessonCompletions = student.lessonCompletions?.filter(
          (com) => com.lesson.schoolYear?.id === schoolYear?.id,
        );

        const examCompletions = student.examCompletions?.filter(
          (com) => com.exam.schoolYear?.id === schoolYear?.id,
        );

        const activityCompletions = student.activityCompletions?.filter(
          (com) =>
            com.activityCategory.activity.schoolYear?.id === schoolYear?.id,
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

  async getStudentLessonsByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.lessonService.getLessonsWithCompletionsByStudentIdAndTeacherId(
      student.id,
      teacherId,
      schoolYear.id,
    );
  }

  async getStudentExamsByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
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
        schoolYear.id,
      );

    const transformedExams = Promise.all(
      exams.map(async (exam) => {
        const rankings = await this.studentExamService.generateExamRankings(
          exam as Exam,
          teacherId,
          schoolYear.id,
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
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
        schoolYear.id,
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const exam =
      (await this.studentExamService.getBasicOneWithCompletionsBySlugAndStudentId(
        slug,
        student.id,
        schoolYear.id,
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
        user: {
          publicId: publicId.toUpperCase(),
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
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
    ) as Promise<Activity>;
  }
}
