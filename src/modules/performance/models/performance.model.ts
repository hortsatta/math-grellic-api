import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';

export type StudentPerformance = StudentUserAccount & {
  examCurrentCount: number;
  examTotalCount: number;
  examCompletedCount: number;
  examPassedCount: number;
  examFailedCount: number;
  examExpiredCount: number;
  overallExamCompletionPercent: number;
  overallExamRank: number;
  overallExamScore: number | null;
  activityTotalCount: number;
  activityCompletedCount: number;
  activityIncompleteCount: number;
  overallActivityCompletionPercent: number;
  overallActivityRank: number;
  overallActivityScore: number | null;
  lessonTotalCount: number;
  lessonCurrentCount: number;
  lessonCompletedCount: number;
  overallLessonCompletionPercent: number;
};

export type StudentData = {
  studentId: number;
  score: any;
  completions: any[];
};
