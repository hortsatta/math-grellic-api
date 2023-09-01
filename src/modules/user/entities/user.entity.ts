import { Column, Entity, OneToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { UserApprovalStatus, UserRole } from '#/modules/user/enums/user.enum';
import { TeacherUserAccount } from './teacher-user-account.entity';
import { StudentUserAccount } from './student-user-account.entity';

@Entity()
export class User extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  supabaseUserId: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  publicId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

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
}

// @OneToOne(type => AdminProfile, profile => profile.user, { eager: true, cascade: true })
// @JoinColumn()
// adminProfile: AdminProfile;
