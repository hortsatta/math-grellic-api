import dayjs from 'dayjs';
import randomstring from 'randomstring';

import { UserRole } from '#/modules/user/enums/user.enum';

const abbrvRoles = {
  [UserRole.Admin]: 'ADM',
  [UserRole.Teacher]: 'TEA',
  [UserRole.Student]: 'STU',
};

export function generatePublicId(num: number, role: UserRole): string {
  const currentYear = dayjs().format('YY');
  const prefix = abbrvRoles[role];
  const suffix = randomstring.generate({
    length: 2,
    charset: 'alphabetic',
    capitalization: 'uppercase',
  });

  return `${prefix}${(num + 1)
    .toString()
    .padStart(3, '0')}-${currentYear}${suffix}`;
}
