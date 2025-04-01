import { ExamScheduleStatus } from '#/common/enums/content.enum';
import { ExamCompletion } from '../entities/exam-completion.entity';
import { ExamSchedule } from '../entities/exam-schedule.entity';
import { Exam } from '../entities/exam.entity';

export type ExamAnswer = {
  questionId: number;
  selectedChoiceId?: number;
};

export type ExamStudent = {
  studentId: number;
  answers: ExamAnswer[];
};

export type ExamRoom = {
  name: string;
  examId: number;
  scheduleId: number;
  endDate: Date;
  interval: NodeJS.Timeout;
  students: ExamStudent[];
};

export type ExamScheduleResponse = ExamSchedule & {
  isRecent: boolean | null;
};

export type ExamCompletionResponse = ExamCompletion & {
  isHighest: boolean | null;
  isRecent: boolean | null;
};

export type ExamResponse = Omit<Exam, 'schedules' | 'completions'> & {
  schedules: Partial<ExamScheduleResponse>[];
  completions: Partial<ExamCompletionResponse>[];
  scheduleStatus: ExamScheduleStatus;
  rank: number | null;
};
