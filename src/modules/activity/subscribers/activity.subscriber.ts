import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

import { generateSlug } from '#/common/helpers/string.helper';
import { Activity } from '../entities/activity.entity';

@EventSubscriber()
export class ActivitySubscriber implements EntitySubscriberInterface<Activity> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Activity;
  }

  beforeInsert(event: InsertEvent<Activity>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }

  beforeUpdate(event: UpdateEvent<Activity>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }
}
