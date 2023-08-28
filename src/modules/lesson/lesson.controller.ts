import { Body, Controller, Get, Post } from '@nestjs/common';

import { Serialize } from '#/common/interceptors/serialize.interceptor';
import { Lesson } from './entities/lesson.entity';
import { LessonResponseDto } from './dtos/lesson-response.dto';
import { LessonCreateDto } from './dtos/lesson-create.dto';
import { LessonService } from './lesson.service';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @Serialize(LessonResponseDto)
  // TEMP
  // @UseInterceptors(FilterFieldsInterceptor)
  findAll(): Promise<Lesson[]> {
    return this.lessonService.findAll();
  }

  @Post()
  @Serialize(LessonResponseDto)
  create(@Body() body: LessonCreateDto): Promise<Lesson> {
    return this.lessonService.create(body);
  }
}
