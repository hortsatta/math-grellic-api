import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { StudentPerformance } from '#/modules/performance/models/performance.model';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { TeacherLessonService } from '#/modules/lesson/services/teacher-lesson.service';
import { StudentLessonService } from '#/modules/lesson/services/student-lesson.service';
import { TeacherExamService } from '#/modules/exam/services/teacher-exam.service';
import { StudentExamService } from '#/modules/exam/services/student-exam.service';
import { TeacherActivityService } from '#/modules/activity/services/teacher-activity.service';
import { StudentActivityService } from '#/modules/activity/services/student-activity.service';
import { TeacherPerformanceService } from '#/modules/performance/services/teacher-performance.service';
import { TeacherScheduleService } from '#/modules/schedule/schedules/teacher-schedule.service';
import { StudentScheduleService } from '#/modules/schedule/schedules/student-schedule.service';
import {
  StudentSearchResults,
  TeacherSearchResults,
} from '../models/search-results.model';
import { GlobalSearchFilter } from '../enums/global-search.enum';
import { countNonNull } from '#/common/helpers/array.helper';

@Injectable()
export class GlobalSearchService {
  constructor(
    @Inject(TeacherLessonService)
    private readonly teacherLessonService: TeacherLessonService,
    @Inject(StudentLessonService)
    private readonly studentLessonService: StudentLessonService,
    @Inject(TeacherExamService)
    private readonly teacherExamService: TeacherExamService,
    @Inject(StudentExamService)
    private readonly studentExamService: StudentExamService,
    @Inject(TeacherActivityService)
    private readonly teacherActivityService: TeacherActivityService,
    @Inject(StudentActivityService)
    private readonly studentActivityService: StudentActivityService,
    @Inject(TeacherPerformanceService)
    private readonly teacherPerformanceService: TeacherPerformanceService,
    @Inject(TeacherScheduleService)
    private readonly teacherScheduleService: TeacherScheduleService,
    @Inject(StudentScheduleService)
    private readonly studentScheduleService: StudentScheduleService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
  ) {}

  async searchByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    q?: string,
    filters?: string,
    schoolYearId?: number,
  ): Promise<[TeacherSearchResults, number]> {
    if (!q?.trim().length || !filters) {
      return [
        {
          lessons: [],
          exams: [],
          activities: [],
          studentPerformances: [],
          meetingSchedules: [],
        },
        0,
      ];
    }

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const [
      [lessons, lessonCount],
      [exams, examCount],
      [activities, activityCount],
      [studentPerformances, studentCount],
      [meetingSchedules, meetingCount],
    ] = await Promise.all([
      filters.includes(GlobalSearchFilter.Lesson)
        ? this.teacherLessonService.getPaginatedTeacherLessonsByTeacherId(
            teacherId,
            sort,
            take,
            undefined,
            q,
            undefined,
            schoolYearId,
          )
        : [[], 0],
      filters.includes(GlobalSearchFilter.Exam)
        ? this.teacherExamService.getPaginatedTeacherExamsByTeacherId(
            teacherId,
            sort,
            take,
            undefined,
            q,
            undefined,
            schoolYearId,
          )
        : [[], 0],
      filters.includes(GlobalSearchFilter.Activity)
        ? this.teacherActivityService.getPaginatedTeacherActivitiesByTeacherId(
            teacherId,
            sort,
            take,
            undefined,
            q,
            undefined,
            schoolYearId,
          )
        : [[], 0],
      (filters.includes(GlobalSearchFilter.Student)
        ? this.teacherPerformanceService.getPaginatedStudentPerformancesByTeacherId(
            teacherId,
            undefined,
            take,
            undefined,
            q,
            undefined,
            schoolYearId,
          )
        : [[], 0]) as [StudentPerformance[], number],
      filters.includes(GlobalSearchFilter.MeetingSchedule)
        ? this.teacherScheduleService.getPaginatedTeacherMeetingSchedulesByTeacherId(
            teacherId,
            sort,
            take,
            undefined,
            q,
            schoolYearId,
          )
        : [[], 0],
    ]);

    const totalCount =
      lessonCount + examCount + activityCount + studentCount + meetingCount;

    return [
      {
        lessons,
        exams,
        activities,
        studentPerformances,
        meetingSchedules,
      },
      totalCount,
    ];
  }

  async searchByStudentId(
    studentId: number,
    sort: string,
    q?: string,
    filters?: string,
    schoolYearId?: number,
  ): Promise<[StudentSearchResults, number]> {
    if (!q?.trim().length || !filters) {
      return [
        {
          lessons: null,
          exams: null,
          activities: [],
          meetingSchedules: null,
        },
        0,
      ];
    }

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const [lessons, exams, activities, meetingSchedules] = await Promise.all([
      filters.includes(GlobalSearchFilter.Lesson)
        ? this.studentLessonService.getStudentLessonsByStudentId(
            studentId,
            q,
            schoolYearId,
          )
        : null,
      filters.includes(GlobalSearchFilter.Exam)
        ? this.studentExamService.getStudentExamsByStudentId(
            studentId,
            q,
            schoolYearId,
          )
        : null,
      filters.includes(GlobalSearchFilter.Activity)
        ? this.studentActivityService.getStudentActivitiesByStudentId(
            studentId,
            q,
            schoolYearId,
          )
        : null,
      filters.includes(GlobalSearchFilter.MeetingSchedule)
        ? this.studentScheduleService.getStudentMeetingSchedulesByStudentId(
            studentId,
            q,
            schoolYearId,
          )
        : null,
    ]);

    const transformedLessons = !!lessons
      ? {
          upcomingLesson: lessons.upcomingLesson,
          moreLessons: [
            ...(lessons.latestLesson != null ? [lessons.latestLesson] : []),
            ...lessons.previousLessons,
          ],
        }
      : null;

    const transformedExams = !!exams
      ? {
          upcomingExam: exams.upcomingExam,
          ongoingExams: !!exams.ongoingExams ? [] : exams.ongoingExams,
          moreExams: [
            ...(exams.latestExam != null ? [exams.latestExam as Exam] : []),
            ...(exams.previousExams as Exam[]),
          ],
        }
      : null;

    const transformedActivities = !!activities
      ? [...activities.featuredActivities, ...activities.otherActivities]
      : [];

    const transformedMeetingSchedules = !!meetingSchedules
      ? {
          upcomingMeetingSchedules: meetingSchedules.upcomingMeetingSchedules,
          moreMeetingSchedules: [
            ...meetingSchedules.currentMeetingSchedules,
            ...meetingSchedules.previousMeetingSchedules,
          ],
        }
      : null;

    const lessonTotalCount = Object.values(transformedLessons).reduce(
      (sum, val) => sum + countNonNull(val),
      0,
    );

    const examTotalCount = Object.values(transformedExams).reduce(
      (sum, val) => sum + countNonNull(val),
      0,
    );

    const meetingScheduleTotalCount = Object.values(
      transformedMeetingSchedules,
    ).reduce((sum, val) => sum + countNonNull(val), 0);

    return [
      {
        lessons: !!lessonTotalCount ? transformedLessons : null,
        exams: !!examTotalCount ? transformedExams : null,
        activities: transformedActivities,
        meetingSchedules: !!meetingScheduleTotalCount
          ? transformedMeetingSchedules
          : null,
      },
      lessonTotalCount +
        examTotalCount +
        meetingScheduleTotalCount +
        transformedActivities.length,
    ];
  }
}
