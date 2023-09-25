import {
  EventSubscriber,
  EntitySubscriberInterface,
  DataSource,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

import { generateSlug } from '#/common/helpers/string.helper';
import { Exam } from '../entities/exam.entity';

@EventSubscriber()
export class ExamSubscriber implements EntitySubscriberInterface<Exam> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Exam;
  }

  beforeInsert(event: InsertEvent<Exam>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }

  beforeUpdate(event: UpdateEvent<Exam>) {
    const value = `${event.entity.orderNumber} ${event.entity.title}`;
    event.entity.slug = generateSlug(value);
  }
}
