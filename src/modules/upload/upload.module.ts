import { Module } from '@nestjs/common';

import { SupabaseService } from '../core/supabase.service';
import { SchoolYearModule } from '../school-year/school-year.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [SchoolYearModule],
  controllers: [UploadController],
  providers: [UploadService, SupabaseService],
  exports: [UploadService],
})
export class UploadModule {}
