import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

import { generateSlug } from '#/common/helpers/string.helper';
import { Lesson } from '../entities/lesson.entity';

@EventSubscriber()
export class LessonSubscriber implements EntitySubscriberInterface<Lesson> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Lesson;
  }

  beforeInsert(event: InsertEvent<Lesson>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }

  beforeUpdate(event: UpdateEvent<Lesson>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }
}
