import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';

export type StudentPerformance = StudentUserAccount & {
  currentExamCount: number;
  examsCompletedCount: number;
  examsPassedCount: number;
  examsFailedCount: number;
  examsExpiredCount: number;
  overallExamCompletionPercent: number;
  overallExamRank: number;
  overallExamScore: number | null;
  totalActivityCount: number;
  activitiesCompletedCount: number;
  overallActivityCompletionPercent: number;
  overallActivityRank: number;
  overallActivityScore: number | null;
  totalLessonCount: number;
  currentLessonCount: number;
  lessonsCompletedCount: number;
  overallLessonCompletionPercent: number;
};
