import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { SerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { Lesson } from './entities/lesson.entity';
import { LessonResponseDto } from './dtos/lesson-response.dto';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonUpdateDto } from './dtos/lesson-update.dto';
import { LessonService } from './lesson.service';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @SerializeInterceptor(LessonResponseDto)
  // TEMP
  // @UseInterceptors(FilterFieldsInterceptor)
  findAll(): Promise<Lesson[]> {
    return this.lessonService.findAll();
  }

  @Get('/:slug')
  @SerializeInterceptor(LessonResponseDto)
  // @UseInterceptors(FilterFieldsInterceptor)
  async findOneBySlug(@Param('slug') slug: string): Promise<Lesson> {
    return this.lessonService.findOneBySlug(slug);
  }

  @Post()
  @SerializeInterceptor(LessonResponseDto)
  create(@Body() body: LessonCreateDto): Promise<Lesson> {
    return this.lessonService.create(body);
  }

  @Patch('/:id')
  @SerializeInterceptor(LessonResponseDto)
  update(
    @Param('id') id: number,
    @Body() body: LessonUpdateDto,
  ): Promise<Lesson> {
    return this.lessonService.update(id, body);
  }

  @Delete('/:id')
  @HttpCode(204)
  delete(@Param('id') id: number): Promise<unknown> {
    return this.lessonService.delete(id);
  }
}
