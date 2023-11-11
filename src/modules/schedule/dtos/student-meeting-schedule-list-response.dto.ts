import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { MeetingScheduleResponseDto } from './meeting-schedule-response.dto';

export class StudentMeetingScheduleListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  upcomingMeetingSchedules: MeetingScheduleResponseDto[];

  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  currentMeetingSchedules: MeetingScheduleResponseDto[];

  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  previousMeetingSchedules: MeetingScheduleResponseDto[];
}
