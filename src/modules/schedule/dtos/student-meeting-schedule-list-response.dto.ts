import { Expose, Type } from 'class-transformer';
import { MeetingScheduleResponseDto } from './meeting-schedule-response.dto';

export class StudentMeetingScheduleListResponseDto {
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
