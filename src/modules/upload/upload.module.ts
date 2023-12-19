import { Module } from '@nestjs/common';

import { ExamModule } from '../exam/exam.module';
import { ActivityModule } from '../activity/activity.module';
import { SupabaseService } from '../core/supabase.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ExamModule, ActivityModule],
  controllers: [UploadController],
  providers: [UploadService, SupabaseService],
})
export class UploadModule {}
