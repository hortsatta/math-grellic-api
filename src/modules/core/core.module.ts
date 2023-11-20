import { Module } from '@nestjs/common';

import { CoreController } from './core.controller';
import { CoreGateway } from './core.gateway';
import { CoreService } from './core.service';

@Module({
  controllers: [CoreController],
  providers: [CoreGateway, CoreService],
})
export class CoreModule {}
