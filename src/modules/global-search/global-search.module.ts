import { Module } from '@nestjs/common';

import { LessonModule } from '../lesson/lesson.module';
import { ExamModule } from '../exam/exam.module';
import { ActivityModule } from '../activity/activity.module';
import { PerformanceModule } from '../performance/performance.module';
import { SchoolYearModule } from '../school-year/school-year.module';
import { GlobalSearchController } from './global-search.controller';
import { GlobalSearchService } from './services/global-search.service';

@Module({
  imports: [
    LessonModule,
    ExamModule,
    ActivityModule,
    PerformanceModule,
    SchoolYearModule,
  ],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService],
})
export class GlobalSearchModule {}
