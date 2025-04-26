// - teacher  FK -- for students only

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { User } from '#/modules/user/entities/user.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';
import { SchoolYear } from './school-year.entity';

@Entity()
export class SchoolYearEnrollment extends BaseEntity {
  @Column({
    type: 'enum',
    enum: SchoolYearEnrollmentApprovalStatus,
    default: SchoolYearEnrollmentApprovalStatus.Pending,
  })
  approvalStatus: SchoolYearEnrollmentApprovalStatus;

  @Column({ type: 'timestamp', nullable: true })
  approvalDate: Date;

  @Column({ type: 'text', nullable: true })
  approvalRejectedReason: string;

  @ManyToOne(() => SchoolYear, (schoolYear) => schoolYear.enrollments, {
    onDelete: 'CASCADE',
  })
  schoolYear: SchoolYear;

  @ManyToOne(() => User, (user) => user.enrollment, {
    onDelete: 'CASCADE',
  })
  user: User;

  // For students only
  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.enrolledStudents,
    { nullable: true },
  )
  @JoinColumn()
  teacherUser: TeacherUserAccount;
}
