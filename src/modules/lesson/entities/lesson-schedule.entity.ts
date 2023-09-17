import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Lesson } from './lesson.entity';

@Entity()
export class LessonSchedule extends BaseEntity {
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ManyToOne(() => Lesson, (lesson) => lesson.schedules, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;

  @ManyToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.lessonSchedules,
    { nullable: true },
  )
  @JoinTable({ name: 'lesson_schedule_students' })
  students: StudentUserAccount[] | null;
}
