import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import dayjs from '#/common/configs/dayjs.config';
import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UserRole } from '../../user/enums/user.enum';
import { CurrentUser } from '../../user/decorators/current-user.decorator';
import { UseJwtAuthGuard } from '../../auth/auth.guard';
import { User } from '../../user/entities/user.entity';
import { SchoolYearResponse } from '../models/school-year.model';
import { SchoolYear } from '../entities/school-year.entity';
import { SchoolYearResponseDto } from '../dtos/school-year-response.dto';
import { SchoolYearCreateDto } from '../dtos/school-year-create.dto';
import { SchoolYearUpdateDto } from '../dtos/school-year-update.dto';
import { SchoolYearService } from '../services/school-year.service';

const ADMIN_URL = '/admins';

@Controller('school-years')
export class SchoolYearController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  // ADMINS

  @Get(`${ADMIN_URL}/list`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(SchoolYearResponseDto)
  getPaginatedSchoolYears(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Partial<SchoolYearResponse>[], number]> {
    return this.schoolYearService.getPaginatedSchoolYears(
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get('/list')
  @UseJwtAuthGuard()
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(SchoolYearResponseDto)
  getSchoolYearsByCurrentUserId(
    @CurrentUser() user: User,
  ): Promise<Partial<SchoolYearResponse>[]> {
    return this.schoolYearService.getAllByCurrentUserId(user.id);
  }

  @Get(`/:slug${ADMIN_URL}`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(SchoolYearResponseDto)
  @UseFilterFieldsInterceptor()
  getOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ): Promise<Partial<SchoolYearResponse>> {
    return this.schoolYearService.getOneBySlug(slug, user.id);
  }

  @Post()
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(SchoolYearResponseDto)
  create(
    @Body() body: SchoolYearCreateDto,
    @CurrentUser() user: User,
  ): Promise<SchoolYear> {
    const { id: adminId } = user.adminUserAccount;
    const {
      startDate,
      endDate,
      enrollmentStartDate,
      enrollmentEndDate,
      gracePeriodEndDate,
      ...moreBody
    } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).startOf('day').toDate() }),
      ...(endDate && { endDate: dayjs(endDate).endOf('day').toDate() }),
      ...(enrollmentStartDate && {
        enrollmentStartDate: dayjs(enrollmentStartDate).startOf('day').toDate(),
      }),
      ...(enrollmentEndDate && {
        enrollmentEndDate: dayjs(enrollmentEndDate).endOf('day').toDate(),
      }),
      ...(gracePeriodEndDate && {
        gracePeriodEndDate: dayjs(gracePeriodEndDate).endOf('day').toDate(),
      }),
    };

    return this.schoolYearService.create(transformedBody, adminId);
  }

  @Patch('/:slug')
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(SchoolYearResponseDto)
  update(
    @Param('slug') slug: string,
    @Body() body: SchoolYearUpdateDto,
    @CurrentUser() user: User,
  ): Promise<SchoolYear> {
    const { id: adminId } = user.adminUserAccount;

    const {
      startDate,
      endDate,
      enrollmentStartDate,
      enrollmentEndDate,
      gracePeriodEndDate,
      ...moreBody
    } = body;

    const transformedBody = {
      ...moreBody,
      ...(startDate && { startDate: dayjs(startDate).startOf('day').toDate() }),
      ...(endDate && { endDate: dayjs(endDate).endOf('day').toDate() }),
      ...(enrollmentStartDate && {
        enrollmentStartDate: dayjs(enrollmentStartDate).startOf('day').toDate(),
      }),
      ...(enrollmentEndDate && {
        enrollmentEndDate: dayjs(enrollmentEndDate).endOf('day').toDate(),
      }),
      ...(gracePeriodEndDate && {
        gracePeriodEndDate: dayjs(gracePeriodEndDate).endOf('day').toDate(),
      }),
    };

    return this.schoolYearService.update(slug, transformedBody, adminId);
  }

  @Delete('/:slug')
  @UseJwtAuthGuard(UserRole.Admin)
  async delete(@Param('slug') slug: string, @CurrentUser() user: User) {
    const { id: adminId } = user.adminUserAccount;
    return this.schoolYearService.delete(slug, adminId);
  }

  @Get('/current')
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(SchoolYearResponseDto)
  @UseFilterFieldsInterceptor()
  getCurrent(@CurrentUser() user: User) {
    return this.schoolYearService.getCurrentSchoolYear(user.id);
  }

  @Get('/:id')
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(SchoolYearResponseDto)
  @UseFilterFieldsInterceptor()
  getOneById(@Param('id') id: number, @CurrentUser() user: User) {
    return this.schoolYearService.getOneById(id, user.id);
  }
}
