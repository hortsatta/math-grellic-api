import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Exam } from './exam.entity';
import { ExamCompletion } from './exam-completion.entity';

@Entity()
export class ExamSchedule extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @ManyToOne(() => Exam, (exam) => exam.schedules, {
    onDelete: 'CASCADE',
  })
  exam: Exam;

  @OneToMany(() => ExamCompletion, (examCompletion) => examCompletion.schedule)
  completions: ExamCompletion[];

  // TODO exam schedule should specify student and not null
  @ManyToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.examSchedules,
    { nullable: true },
  )
  @JoinTable({ name: 'exam_schedule_students' })
  students: StudentUserAccount[];
}
