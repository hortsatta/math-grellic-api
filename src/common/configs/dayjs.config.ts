import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Initialize dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
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
// Use checker methods
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const tzDayjs = (...args: any[]) => {
  return dayjs(...args).tz();
};

const tzUnix = (value: number) => {
  return dayjs.unix(value).tz();
};

tzDayjs.unix = tzUnix;
tzDayjs.duration = dayjs.duration;
tzDayjs.months = dayjs.months;

export default tzDayjs;
