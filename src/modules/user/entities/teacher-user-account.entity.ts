import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

import { User } from './user.entity';
import { UserAccount as UserAccountEntity } from './user-account.entity';
import { StudentUserAccount } from './student-user-account.entity';

@Entity()
export class TeacherUserAccount extends UserAccountEntity {
  @Column({ type: 'text', nullable: true })
  aboutMe: string;

  @Column({ type: 'text', nullable: true })
  educationalBackground: string;

  @Column({ type: 'text', nullable: true })
  teachingExperience: string;

  @Column({ type: 'text', nullable: true })
  teachingCertifications: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 255, array: true, default: [] })
  socialMediaLinks: string[];

  @Column({ type: 'varchar', length: 255, array: true, default: [] })
  emails: string[];

  @OneToOne(() => User, (user) => user.teacherUserAccount)
  @JoinColumn()
  user: User;

  @OneToMany(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.teacherUser,
  )
  students: StudentUserAccount[];
}
