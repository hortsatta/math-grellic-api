import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { SchoolYear } from '#/modules/school-year/entities/school-year.entity';

@Entity()
export class MeetingSchedule extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  meetingUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @ManyToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.meetingSchedules,
    { nullable: true },
  )
  @JoinTable({ name: 'meeting_schedule_students' })
  students: StudentUserAccount[];

  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.meetingSchedules,
    {
      onDelete: 'CASCADE',
    },
  )
  teacher: TeacherUserAccount;

  @ManyToOne(() => SchoolYear, (schoolYear) => schoolYear.meetingSchedules)
  @JoinColumn()
  schoolYear: SchoolYear;
}
