import { Column, Entity, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Lesson } from './lesson.entity';

@Entity()
export class LessonSchedule extends BaseEntity {
  @Column({ type: 'timestamp' })
  startDate: Date;

  // TODO
  // Foreign column for user profile
  // @Column({ type: 'timestamp' })
  // scheduledStudents: []

  @ManyToOne(() => Lesson, (lesson) => lesson.schedules)
  lesson: Lesson;
}
