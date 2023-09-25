import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Exam } from './exam.entity';

@Entity()
export class ExamSchedule extends BaseEntity {
  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @ManyToOne(() => Exam, (exam) => exam.schedules, {
    onDelete: 'CASCADE',
  })
  exam: Exam;

  // TODO exam schedule should specify student and not null
  @ManyToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.examSchedules,
    { nullable: true },
  )
  @JoinTable({ name: 'exam_schedule_students' })
  students: StudentUserAccount[];
}
