import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseAuthGuard } from '#/common/guards/auth.guard';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user.enum';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { Exam } from './entities/exam.entity';
import { ExamResponseDto } from './dtos/exam-response.dto';
import { ExamCreateDto } from './dtos/exam-create.dto';
import { ExamUpdateDto } from './dtos/exam-update.dto';
import { ExamService } from './exam.service';

@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  // TEACHERS

  @Get('/teachers/list')
  @UseAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(ExamResponseDto)
  getTeacherExamsByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Exam[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.examService.getPaginationTeacherExamsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  create(
    @Body() body: ExamCreateDto,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.create(body, teacherId);
  }

  @Patch('/:slug')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(ExamResponseDto)
  update(
    @Param('slug') slug: string,
    @Query('schedule') scheduleId: number,
    @Body() body: ExamUpdateDto,
    @CurrentUser() user: User,
  ): Promise<Exam> {
    const { id: teacherId } = user.teacherUserAccount;
    return this.examService.update(slug, body, teacherId, scheduleId);
  }
}
