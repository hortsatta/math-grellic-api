import { Inject, Injectable } from '@nestjs/common';

import dayjs from '#/common/configs/dayjs.config';
import { generateFullName } from '#/common/helpers/string.helper';
import { ExamCompletion } from '#/modules/exam/entities/exam-completion.entity';
import { LessonCompletion } from '#/modules/lesson/entities/lesson-completion.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { ActivityCategoryType } from '#/modules/activity/enums/activity.enum';
import { LessonService } from '#/modules/lesson/services/lesson.service';
import { ActivityService } from '#/modules/activity/activity.service';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';

@Injectable()
export class PerformanceService {
  constructor(
    @Inject(LessonService)
    private readonly lessonService: LessonService,
    @Inject(StudentExamService)
    private readonly studentExamService: StudentExamService,
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
    const currentDateTime = dayjs().toDate();

    const allExams = await this.studentExamService.getAllByStudentId(
      student.id,
    );

    const pastExams = allExams.filter((exam) =>
      exam.schedules.every((schedule) =>
        dayjs(schedule.endDate).isSameOrBefore(currentDateTime),
      ),
    );

    const examCompletions: ExamCompletion[] = Object.values(
      student.examCompletions.reduce((acc, com) => {
        const examId = com.exam.id;

        if (!acc[examId] || com.score > acc[examId].score) {
          acc[examId] = com;
        }

        return acc;
      }, {}),
    );

    const examsPassedCount = examCompletions.filter(
      (ec) => ec.score >= ec.exam.passingPoints,
    ).length;

    const examsFailedCount = examCompletions.filter(
      (ec) => ec.score < ec.exam.passingPoints,
    ).length;

    const examsExpiredCount = pastExams.filter(
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
      currentExamCount: pastExams.length,
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
}
