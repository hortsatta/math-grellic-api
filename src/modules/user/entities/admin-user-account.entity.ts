import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

import { User } from './user.entity';
import { UserAccount as UserAccountEntity } from './user-account.entity';
import { TeacherUserAccount } from './teacher-user-account.entity';

@Entity()
export class AdminUserAccount extends UserAccountEntity {
  @Column({ type: 'text', nullable: true })
  aboutMe: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  messengerLink: string;

  @Column({ type: 'varchar', length: 255, array: true, default: [] })
  emails: string[];

  @OneToOne(() => User, (user) => user.studentUserAccount)
  @JoinColumn()
  user: User;

  @OneToMany(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.adminUser,
  )
  teachers: TeacherUserAccount[];

  // Do announcements for teachers or students or both
  // @OneToMany(() => Announcement, (announcement) => announcement.admin)
  // announcements: Announcement[];
}
