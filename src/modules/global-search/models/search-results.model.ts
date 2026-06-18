import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { StudentPerformance } from '#/modules/performance/models/performance.model';

export type SearchResults = {
  lessons: Lesson[];
  exams: Exam[];
  activities: Activity[];
  studentPerformances: StudentPerformance[];
};
