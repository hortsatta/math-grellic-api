import { Module } from '@nestjs/common';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { CoreController } from './core.controller';
import { CoreGateway } from './core.gateway';
import { CoreService } from './core.service';

@Module({
  controllers: [CoreController],
  providers: [CoreGateway, CoreService],
})
export class CoreModule {
  constructor() {
    // Initialize dayjs
    dayjs.extend(relativeTime);
    // Use custom format for time
    dayjs.extend(customParseFormat);
    // Set global dayjs settings
    dayjs.extend(localeData);
    // Set dayjs start of week to monday
    dayjs.extend(updateLocale);
    dayjs.updateLocale('en', {
      weekStart: 1,
    });
    // Set default timezone to Philippines
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('Asia/Manila');
  }
}
