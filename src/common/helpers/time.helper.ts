import dayjs from '#/common/configs/dayjs.config';

export function convertMsToSeconds(ms: number) {
  const duration = dayjs.duration(ms, 'milliseconds');
  return duration.seconds();
}
