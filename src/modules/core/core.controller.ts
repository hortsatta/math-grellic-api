import { Controller, Get } from '@nestjs/common';
import dayjs from 'dayjs';

@Controller('core')
export class CoreController {
  @Get('/now')
  getDateTimeNow(): Date {
    return dayjs().toDate();
  }
}
