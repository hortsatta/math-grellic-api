import { Module } from '@nestjs/common';

import { SupabaseService } from '../core/supabase.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, SupabaseService],
})
export class UploadModule {}
