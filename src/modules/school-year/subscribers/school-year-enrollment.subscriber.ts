import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';

import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';

@EventSubscriber()
export class SchoolYearEnrollmentSubscriber
  implements EntitySubscriberInterface<SchoolYearEnrollment>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SchoolYearEnrollment;
  }

  beforeInsert(event: InsertEvent<SchoolYearEnrollment>) {
    // Automatically set approval date if status is not pending,
    // else set date to null
    if (
      !event.entity.approvalStatus ||
      event.entity.approvalStatus === SchoolYearEnrollmentApprovalStatus.Pending
    ) {
      event.entity.approvalDate = null;
    } else {
      event.entity.approvalDate = dayjs().toDate();
    }
  }

  async beforeUpdate(event: UpdateEvent<SchoolYearEnrollment>) {
    const prevUser = await event.connection
      .getRepository(SchoolYearEnrollment)
      .findOne({ where: { id: event.entity.id } });

    // Check previous data and automatically set approval date
    // if status is not pending, else set date to null
    if (prevUser.approvalStatus !== event.entity.approvalStatus) {
      if (
        !event.entity.approvalStatus ||
        event.entity.approvalStatus ===
          SchoolYearEnrollmentApprovalStatus.Pending
      ) {
        event.entity.approvalDate = null;
      } else {
        event.entity.approvalDate = dayjs().toDate();
      }
    }
  }
}
