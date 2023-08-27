import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base } from '#/common/entities/base.entity';
import { Lesson } from './lesson.entity';

@Entity()
export class LessonSchedule extends Base {
  @Column({ type: 'timestamp' })
  startDate: Date;

  // Foreign column for user profile
  // @Column({ type: 'timestamp' })
  // scheduledStudents: []

  @ManyToOne(() => Lesson, (lesson) => lesson.schedules)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}
