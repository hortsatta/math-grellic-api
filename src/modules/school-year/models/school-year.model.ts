import { SchoolYear } from '../entities/school-year.entity';

export type SchoolYearResponse = SchoolYear & {
  isActive: boolean;
  isDone: boolean;
  totalTeacherCount: number;
  totalStudentCount: number;
};
