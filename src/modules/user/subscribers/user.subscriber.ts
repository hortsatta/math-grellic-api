import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import dayjs from 'dayjs';

import { User } from '../entities/user.entity';
import { UserApprovalStatus } from '../enums/user.enum';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  beforeInsert(event: InsertEvent<User>) {
    // TEMP
    event.entity.approvalStatus = UserApprovalStatus.Approved;
    event.entity.approvalDate = dayjs().toDate();

    // Automatically set approval date if status is not pending,
    // else set date to null
    /* if (
       !event.entity.approvalStatus ||
       event.entity.approvalStatus === UserApprovalStatus.Pending
     ) {
       event.entity.approvalDate = null;
     } else {
       event.entity.approvalDate = dayjs().toDate();
     } */
  }

  async beforeUpdate(event: UpdateEvent<User>) {
    const prevUser = await event.connection
      .getRepository(User)
      .findOne({ where: { email: event.entity.email } });

    // Check previous data and automatically set approval date
    // if status is not pending, else set date to null
    if (prevUser.approvalStatus !== event.entity.approvalStatus) {
      if (
        !event.entity.approvalStatus ||
        event.entity.approvalStatus === UserApprovalStatus.Pending
      ) {
        event.entity.approvalDate = null;
      } else {
        event.entity.approvalDate = dayjs().toDate();
      }
    }
  }
}
