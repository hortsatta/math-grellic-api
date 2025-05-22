import { SchoolYear } from '../entities/school-year.entity';

export type SchoolYearResponse = SchoolYear & {
  isActive: boolean;
  isDone: boolean;
  isEnrolled: boolean;
  canEnroll: boolean;
  totalTeacherCount: number;
  totalStudentCount: number;
};

export type SchoolYearStudentsAcademicProgress = {
  passedCount: number;
  failedCount: number;
  ongoingCount: number;
  passedPercent: number;
  failedPercent: number;
  ongoingPercent: number;
  totalStudentCount: number;
};
