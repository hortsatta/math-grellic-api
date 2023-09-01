import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

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
    // Automatically set approval date if status is not pending,
    // else set date to null
    if (event.entity.approvalStatus === UserApprovalStatus.Pending) {
      event.entity.approvalDate = null;
    } else {
      event.entity.approvalDate = new Date();
    }
  }

  async beforeUpdate(event: UpdateEvent<User>) {
    const prevUser = await event.connection
      .getRepository(User)
      .findOne({ where: { email: event.entity.email } });

    // Check previous data and automatically set approval date
    // if status is not pending, else set date to null
    if (prevUser.approvalStatus !== event.entity.approvalStatus) {
      if (event.entity.approvalStatus === UserApprovalStatus.Pending) {
        event.entity.approvalDate = null;
      } else {
        event.entity.approvalDate = new Date();
      }
    }
  }
}