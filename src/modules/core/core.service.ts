import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

@Injectable()
export class CoreService {
  getDateTimeNow(): Date {
    return dayjs().toDate();
  }
}
