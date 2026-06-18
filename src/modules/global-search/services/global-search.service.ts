import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { TeacherLessonService } from '#/modules/lesson/services/teacher-lesson.service';
import { TeacherExamService } from '#/modules/exam/services/teacher-exam.service';
import { TeacherActivityService } from '#/modules/activity/services/teacher-activity.service';
import { TeacherPerformanceService } from '#/modules/performance/services/teacher-performance.service';
import { SearchResults } from '../models/search-results.model';
import { GlobalSearchFilter } from '../enums/global-search.enum';
import { StudentPerformance } from '#/modules/performance/models/performance.model';

@Injectable()
export class GlobalSearchService {
  constructor(
    @Inject(TeacherLessonService)
    private readonly teacherLessonService: TeacherLessonService,
    @Inject(TeacherExamService)
    private readonly teacherExamService: TeacherExamService,
    @Inject(TeacherActivityService)
    private readonly teacherActivityService: TeacherActivityService,
    @Inject(TeacherPerformanceService)
    private readonly teacherPerformanceService: TeacherPerformanceService,
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
  ): Promise<[SearchResults, number]> {
    if (!q?.trim().length || !filters) {
      return [
        { lessons: [], exams: [], activities: [], studentPerformances: [] },
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
    ]);

    const totalCount = lessonCount + examCount + activityCount + studentCount;

    return [
      {
        lessons,
        exams,
        activities,
        studentPerformances,
      },
      totalCount,
    ];
  }
}
