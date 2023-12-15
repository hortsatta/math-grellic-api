import { Module } from '@nestjs/common';

import { CoreController } from './core.controller';
import { CoreGateway } from './core.gateway';
import { CoreService } from './core.service';
import { SupabaseService } from './supabase.service';

@Module({
  controllers: [CoreController],
  providers: [CoreGateway, CoreService, SupabaseService],
  exports: [SupabaseService],
})
export class CoreModule {}
