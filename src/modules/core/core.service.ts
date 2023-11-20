import { Injectable } from '@nestjs/common';
import dayjs from '#/common/configs/dayjs.config';

@Injectable()
export class CoreService {
  getDateTimeNow(): Date {
    return dayjs().toDate();
  }
}
