import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { Lesson } from './entities/lesson.entity';
import { LessonResponseDto } from './dtos/lesson-response.dto';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { LessonService } from './lesson.service';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // Fetch lessons of a particular teacher using its id
  @Get('/teachers/:teacherId')
  @UseAuthGuard([UserRole.Admin, UserRole.Teacher])
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(LessonResponseDto)
  findByTeacherId(
    @Param('teacherId') teacherId: number,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[Lesson[], number]> {
    let order;
    if (sort) {
      const [sortBy, sortOrder] = sort?.split(',') || [];
      order = { [sortBy]: sortOrder };
    }

    return this.lessonService.findByTeacherIdPagination(
      teacherId,
      order,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
    );
  }

  @Get('/:slug')
  @UseAuthGuard()
  @UseSerializeInterceptor(LessonResponseDto)
  @UseFilterFieldsInterceptor()
  findOneBySlug(@Param('slug') slug: string): Promise<Lesson> {
    return this.lessonService.findOneBySlug(slug);
  }

  @Post()
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  create(
    @Body() body: LessonCreateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    return this.lessonService.create(body, user);
  }

  @Patch('/:id')
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(LessonResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: LessonUpdateDto,
  ): Promise<Lesson> {
    return this.lessonService.update(id, body);
  }

  @Delete('/:id')
  @UseAuthGuard(UserRole.Teacher)
  @HttpCode(204)
  delete(@Param('id') id: number): Promise<unknown> {
    return this.lessonService.delete(id);
  }
}
