import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { User } from '#/modules/user/entities/user.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import {
  SchoolYearAcademicProgress,
  SchoolYearEnrollmentApprovalStatus,
} from '../enums/school-year-enrollment.enum';
import { SchoolYear } from './school-year.entity';

@Entity()
export class SchoolYearEnrollment extends BaseEntity {
  @Index()
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

  @Column({
    type: 'enum',
    enum: SchoolYearAcademicProgress,
    nullable: true,
  })
  academicProgress: SchoolYearAcademicProgress;

  @Column({ type: 'text', nullable: true })
  academicProgressRemarks: string;

  @Index()
  @ManyToOne(() => SchoolYear, (schoolYear) => schoolYear.enrollments, {
    onDelete: 'CASCADE',
  })
  schoolYear: SchoolYear;

  @Index()
  @ManyToOne(() => User, (user) => user.enrollments, {
    onDelete: 'CASCADE',
  })
  user: User;

  // - teacher  FK -- for students only
  // For students only
  @Index()
  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.enrolledStudents,
    { nullable: true },
  )
  @JoinColumn()
  teacherUser: TeacherUserAccount;
}
