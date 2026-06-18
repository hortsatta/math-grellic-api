import { Controller, Get, Query } from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { SearchResults } from './models/search-results.model';
import { GlobalSearchResponseDto } from './dtos/global-search-response.dto';
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
  @UseSerializeInterceptor(GlobalSearchResponseDto)
  searchByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('filters') filters?: string,
    @Query('sort') sort?: string,
    @Query('sy') schoolYearId?: number,
  ): Promise<[SearchResults, number]> {
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
}
