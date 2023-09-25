import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { ExamSchedule } from './exam-schedule.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity()
export class Exam extends BaseEntity {
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

  @Column({ type: 'boolean', default: false })
  randomizeQuestions: boolean;

  @Column({ type: 'int' })
  visibleQuestionsCount: number;

  @Column({ type: 'int', default: 1 })
  pointsPerQuestion: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @ManyToMany(() => Lesson, (lesson) => lesson.exams, { nullable: true })
  @JoinTable({ name: 'exam_covered_lessons' })
  coveredLessons: Lesson[] | null;

  @OneToMany(() => ExamQuestion, (examQuestion) => examQuestion.exam, {
    cascade: true,
  })
  questions: ExamQuestion[];

  @OneToMany(() => ExamSchedule, (examSchedule) => examSchedule.exam, {
    cascade: true,
  })
  schedules: ExamSchedule[];

  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.exams,
  )
  @JoinColumn()
  teacher: TeacherUserAccount;
}
