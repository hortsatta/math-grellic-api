import { Column, Entity, OneToMany } from 'typeorm';

import { Base } from '#/common/entities/base.entity';
import { LessonSchedule } from './lesson-schedule.entity';

@Entity()
export class Lesson extends Base {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int', default: 0 })
  status: number;

  @Column({ type: 'int', unique: true })
  orderNumber: number;

  @Column({ type: 'varchar', length: 255 })
  videoUrl: number;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ type: 'text', nullable: true })
  description: number;

  @OneToMany(() => LessonSchedule, (lessonSchedule) => lessonSchedule.lesson)
  schedules: LessonSchedule[];
}
