import { Column, Entity, OneToMany } from 'typeorm';

import { ContentStatus } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { LessonSchedule } from './lesson-schedule.entity';

@Entity()
export class Lesson extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.Draft,
  })
  status: ContentStatus;

  @Column({ type: 'int', unique: true })
  orderNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  videoUrl: string;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => LessonSchedule, (lessonSchedule) => lessonSchedule.lesson, {
    eager: true,
  })
  schedules: LessonSchedule[];
}
