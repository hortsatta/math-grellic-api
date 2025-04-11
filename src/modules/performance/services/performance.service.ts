import { Inject, Injectable } from '@nestjs/common';

import dayjs from '#/common/configs/dayjs.config';
import { generateFullName } from '#/common/helpers/string.helper';
import { ExamCompletion } from '#/modules/exam/entities/exam-completion.entity';
import { LessonCompletion } from '#/modules/lesson/entities/lesson-completion.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { ActivityCategoryType } from '#/modules/activity/enums/activity.enum';
import { LessonService } from '#/modules/lesson/services/lesson.service';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';
import { ActivityService } from '#/modules/activity/services/activity.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { StudentData } from '../models/performance.model';

@Injectable()
export class PerformanceService {
  constructor(
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(StudentExamService)
    private readonly studentExamService: StudentExamService,
    @Inject(ActivityService)
    private readonly activityService: ActivityService,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
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
          lessonCompletedCount: filteredLessonCompletions.length,
          lessonTotalCount: lessons.length,
        };
      }),
    );

    const rankedStudents = transformedStudents
      .filter((s) => s.lessonCompletedCount > 0)
      .sort((a, b) => b.lessonCompletedCount - a.lessonCompletedCount);

    const unrankedStudents = transformedStudents
      .filter((s) => s.lessonCompletedCount <= 0)
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
      // Remove duplicate exam completion and take the highest score per exam
      const filteredExamCompletions: ExamCompletion[] = Object.values(
        student.examCompletions.reduce((acc, com) => {
          const examId = com.exam.id;

          if (!acc[examId] || com.score > acc[examId].score) {
            acc[examId] = com;
          }

          return acc;
        }, {}),
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
    let rankedStudents = [];
    let unrankedStudents = [];

    if (!students.length) {
      // return ranked and unranked students empty array
    }

    const teacher = await this.teacherUserService.getTeacherByStudentId(
      students[0].id,
    );

    const allActivities = await this.activityService.getAllByStudentId(
      students[0].id,
    );

    const activityRankings: {
      activityId: number;
      studentRankings: (StudentData & { rank: number | null })[];
    }[] = [];
    for (const activity of allActivities) {
      const studentRankings =
        await this.activityService.generateActivityRankings(
          activity,
          teacher.id,
        );

      activityRankings.push({
        activityId: activity.id,
        studentRankings,
      });
    }

    // Apply rank number to all null rank values
    const transformedActivityRankings = activityRankings.map((ar) => {
      // Get last rank number
      const lastRankNumber =
        ar.studentRankings.filter((sr) => sr.rank != null).pop()?.rank || 0;
      // And apply rank number to null ranks (last rank number + 1)
      const studentRankings = ar.studentRankings.map((sr) => {
        const rank = sr.rank ?? lastRankNumber + 1;
        return { ...sr, rank };
      });

      return { ...ar, studentRankings };
    });

    const transformedStudents = students
      .filter((student) => {
        const hasCompletions = activityRankings.some((ar) =>
          ar.studentRankings.some(
            (sr) => sr.studentId === student.id && sr.rank != null,
          ),
        );

        return hasCompletions;
      })
      .map((student) => {
        const overallActivityScore = transformedActivityRankings
          .filter((ar) =>
            ar.studentRankings.some((sr) => sr.studentId === student.id),
          )
          .reduce((acc, ar) => {
            const targetRank = ar.studentRankings.find(
              (sr) => sr.studentId === student.id,
            )?.rank;

            return acc + targetRank;
          }, 0);

        return { ...student, overallActivityScore, overallActivityRank: null };
      });

    rankedStudents = transformedStudents
      .filter((s) => s.overallActivityScore != null)
      .sort((a, b) => b.overallActivityScore - a.overallActivityScore)
      .map((student, index) => {
        if (student.overallActivityScore !== previousScore) {
          currentRank = index + 1;
        }

        previousScore = student.overallActivityScore;

        return { ...student, overallActivityRank: currentRank };
      });

    unrankedStudents = students
      .filter((student) => {
        const hasCompletions = activityRankings.some((ar) =>
          ar.studentRankings.some(
            (sr) => sr.studentId === student.id && sr.rank != null,
          ),
        );

        return !hasCompletions;
      })
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
      .map((student) => ({
        ...student,
        overallActivityScore: null,
        overallActivityRank: null,
      }));

    return {
      rankedStudents,
      unrankedStudents,
    };
  }

  async generateOverallLessonDetailedPerformance(student: StudentUserAccount) {
    const currentDateTime = dayjs().toDate();

    const allLessons = await this.lessonService.getAllByStudentId(student.id);

    const availableLessons = allLessons.filter((lesson) =>
      lesson.schedules.some((schedule) =>
        dayjs(schedule.startDate).isSameOrBefore(currentDateTime),
      ),
    );

    const lessonCompletions: LessonCompletion[] = Object.values(
      student.lessonCompletions.reduce((acc, com) => {
        const lessonId = com.lesson.id;

        if (!acc[lessonId]) {
          acc[lessonId] = com;
        }

        return acc;
      }, {}),
    );

    const overallLessonCompletionPercent =
      (lessonCompletions.length / allLessons.length) * 100;

    return {
      lessonTotalCount: allLessons.length,
      lessonCurrentCount: availableLessons.length,
      lessonCompletedCount: lessonCompletions.length,
      overallLessonCompletionPercent,
    };
  }

  async generateOverallExamDetailedPerformance(
    student: StudentUserAccount,
    otherStudents: StudentUserAccount[],
  ) {
    const currentDateTime = dayjs().toDate();

    const allExams = await this.studentExamService.getAllByStudentId(
      student.id,
    );

    const pastExams = allExams.filter((exam) =>
      exam.schedules.every((schedule) =>
        dayjs(schedule.endDate).isSameOrBefore(currentDateTime),
      ),
    );

    const ongoingExams = allExams.filter((exam) =>
      exam.schedules.some(
        (schedule) =>
          dayjs(schedule.startDate).isSameOrBefore(currentDateTime) &&
          dayjs(schedule.endDate).isAfter(currentDateTime),
      ),
    );

    const examCompletions: ExamCompletion[] = Object.values(
      student.examCompletions.reduce((acc, com) => {
        const examId = com.exam.id;
        const isExamUpcoming =
          [...pastExams, ...ongoingExams].findIndex(
            (exam) => exam.id === examId,
          ) < 0;

        if (isExamUpcoming) {
          return acc;
        } else if (!acc[examId] || com.score > acc[examId].score) {
          acc[examId] = com;
        }

        return acc;
      }, {}),
    );

    const examPassedCount = examCompletions.filter(
      (ec) => ec.score >= ec.exam.passingPoints,
    ).length;

    const examFailedCount = examCompletions.filter(
      (ec) => ec.score < ec.exam.passingPoints,
    ).length;

    const examExpiredCount = pastExams.filter(
      (exam) => !examCompletions.some((ec) => ec.exam.id === exam.id),
    ).length;

    // Only count exam with completion
    const overallExamCompletionPercent =
      (examCompletions.length / allExams.length) * 100;

    const { rankedStudents, unrankedStudents } =
      await this.generateOverallExamRankings([student, ...otherStudents]);

    const { overallExamRank, overallExamScore } = [
      ...rankedStudents,
      ...unrankedStudents,
    ].find((s) => s.id === student.id);

    return {
      examCurrentCount: pastExams.length + ongoingExams.length,
      examTotalCount: allExams.length,
      examCompletedCount: examCompletions.length,
      examPassedCount,
      examFailedCount,
      examExpiredCount,
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
      true,
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

      const categoryCompletionCount = new Set(
        sortedCompletions.map((com) => com.activityCategory.id),
      ).size;

      return (categoryCompletionCount / categoryCount) * 100;
    })();

    let activityCompletedCount = 0;
    let activityIncompleteCount = 0;
    // Count activities completed,
    // for time or point game type. count as done if all three levels are completed
    allActivities.forEach((activity) => {
      // Set.size eliminates duplicates
      const completionCount = new Set(
        sortedCompletions
          // Filter only mactching current activity categories
          .filter((com) =>
            activity.categories.some(
              (cat) => cat.id === com.activityCategory.id,
            ),
          )
          // Return array of number
          .map((com) => com.activityCategory.id),
      ).size;

      if (!completionCount) {
        return;
      }

      if (activity.game.type === ActivityCategoryType.Stage) {
        activityCompletedCount += 1;
      } else {
        if (completionCount < 3) {
          activityIncompleteCount += 1;
        } else {
          activityCompletedCount += 1;
        }
      }
    });

    return {
      overallActivityRank,
      overallActivityScore,
      activityTotalCount: allActivities.length,
      activityCompletedCount,
      activityIncompleteCount,
      overallActivityCompletionPercent,
    };
  }
}
