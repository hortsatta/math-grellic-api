import { Column, Entity, OneToMany, OneToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { UserApprovalStatus, UserRole } from '#/modules/user/enums/user.enum';
import { AuditLog } from '#/modules/audit-log/entities/audit-log.entity';
import { SchoolYearEnrollment } from '#/modules/school-year/entities/school-year-enrollment.entity';
import { AdminUserAccount } from './admin-user-account.entity';
import { TeacherUserAccount } from './teacher-user-account.entity';
import { StudentUserAccount } from './student-user-account.entity';

@Entity()
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 11, unique: true, nullable: true })
  publicId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImageUrl: string;

  @Column({
    type: 'enum',
    enum: UserApprovalStatus,
    default: UserApprovalStatus.Pending,
  })
  approvalStatus: UserApprovalStatus;

  @Column({ type: 'timestamp', nullable: true })
  approvalDate: Date;

  @Column({ type: 'text', nullable: true })
  approvalRejectedReason: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @OneToOne(
    () => AdminUserAccount,
    (adminUserAccount) => adminUserAccount.user,
    { eager: true },
  )
  adminUserAccount: AdminUserAccount;

  @OneToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.user,
    { eager: true },
  )
  teacherUserAccount: TeacherUserAccount;

  @OneToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.user,
    { eager: true },
  )
  studentUserAccount: StudentUserAccount;

  @OneToMany(() => SchoolYearEnrollment, (enrollment) => enrollment.user, {
    cascade: true,
  })
  enrollment: SchoolYearEnrollment[];
}
