import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { StudentPerformance } from '#/modules/performance/models/performance.model';
import { MeetingSchedule } from '#/modules/schedule/entities/meeting-schedule.entity';

export type TeacherSearchResults = {
  lessons: Lesson[];
  exams: Exam[];
  activities: Activity[];
  studentPerformances: StudentPerformance[];
  meetingSchedules: MeetingSchedule[];
};

type StudentLessons = {
  upcomingLesson: Lesson | null;
  moreLessons: Lesson[];
};

type StudentExams = {
  upcomingExam: Exam | null;
  ongoingExams: Exam[];
  moreExams: Exam[];
};

type MeetingSchedules = {
  upcomingMeetingSchedules: MeetingSchedule[];
  moreMeetingSchedules: MeetingSchedule[];
};

export type StudentSearchResults = {
  lessons: StudentLessons | null;
  exams: StudentExams | null;
  activities: Activity[];
  meetingSchedules: MeetingSchedules | null;
};
