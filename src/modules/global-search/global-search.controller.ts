import { Controller, Get, Query } from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import {
  StudentSearchResults,
  TeacherSearchResults,
} from './models/search-results.model';
import { TeacherGlobalSearchResponseDto } from './dtos/teacher-global-search-response.dto';
import { StudentGlobalSearchResponseDto } from './dtos/student-global-search-response.dto';
import { GlobalSearchService } from './services/global-search.service';

const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('global-search')
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  // ADMINS

  // TEACHERS

  @Get(`${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(TeacherGlobalSearchResponseDto)
  searchByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('filters') filters?: string,
    @Query('sort') sort?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<[TeacherSearchResults, number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.globalSearchService.searchByTeacherId(
      teacherId,
      sort,
      undefined,
      q,
      filters,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  // STUDENTS
  @Get(`${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(StudentGlobalSearchResponseDto)
  searchByStudentId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('filters') filters?: string,
    @Query('sort') sort?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<[StudentSearchResults, number]> {
    const { id: studentId } = user.studentUserAccount;

    return this.globalSearchService.searchByStudentId(
      studentId,
      sort,
      q,
      filters,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }
}
