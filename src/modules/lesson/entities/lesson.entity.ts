import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { RecordStatus } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { LessonSchedule } from './lesson-schedule.entity';
import { LessonCompletion } from './lesson-completion.entity';

@Entity()
export class Lesson extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.Draft,
  })
  status: RecordStatus;

  @Column({ type: 'int' })
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

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @OneToMany(() => LessonSchedule, (lessonSchedule) => lessonSchedule.lesson)
  schedules: LessonSchedule[];

  @OneToMany(
    () => LessonCompletion,
    (lessonCompletion) => lessonCompletion.lesson,
  )
  completions: LessonCompletion[];

  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.lessons,
  )
  @JoinColumn()
  teacher: TeacherUserAccount;

  @ManyToMany(() => Exam, (exam) => exam.coveredLessons)
  exams: Exam[];
}
