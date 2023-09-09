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

import { SerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { AuthGuard } from '#/common/guards/auth.guard';
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

  @Get('/teacher/:teacherId')
  @AuthGuard([UserRole.Admin, UserRole.Teacher])
  // @UseInterceptors(FilterFieldsInterceptor)
  @SerializeInterceptor(LessonResponseDto)
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
  @SerializeInterceptor(LessonResponseDto)
  // @UseInterceptors(FilterFieldsInterceptor)
  findOneBySlug(@Param('slug') slug: string): Promise<Lesson> {
    return this.lessonService.findOneBySlug(slug);
  }

  @Post()
  @AuthGuard(UserRole.Teacher)
  @SerializeInterceptor(LessonResponseDto)
  create(
    @Body() body: LessonCreateDto,
    @CurrentUser() user: User,
  ): Promise<Lesson> {
    return this.lessonService.create(body, user);
  }

  @Patch('/:id')
  @AuthGuard(UserRole.Teacher)
  @SerializeInterceptor(LessonResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: LessonUpdateDto,
  ): Promise<Lesson> {
    return this.lessonService.update(id, body);
  }

  @Delete('/:id')
  @AuthGuard(UserRole.Teacher)
  @HttpCode(204)
  delete(@Param('id') id: number): Promise<unknown> {
    return this.lessonService.delete(id);
  }
}
