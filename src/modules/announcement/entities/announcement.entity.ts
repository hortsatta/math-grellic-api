import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { SchoolYear } from '#/modules/school-year/entities/school-year.entity';

@Entity()
export class Announcement extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ManyToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.announcements,
    { nullable: true },
  )
  @JoinTable({ name: 'announcement_students' })
  students: StudentUserAccount[];

  @Index()
  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.announcements,
    {
      onDelete: 'CASCADE',
    },
  )
  teacher: TeacherUserAccount;

  @Index()
  @ManyToOne(() => SchoolYear, (schoolYear) => schoolYear.announcements)
  @JoinColumn()
  schoolYear: SchoolYear;
}
