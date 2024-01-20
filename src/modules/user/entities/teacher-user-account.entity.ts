import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { MeetingSchedule } from '#/modules/schedule/entities/meeting-schedule.entity';
import { Announcement } from '#/modules/announcement/entities/announcement.entity';
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  messengerLink: string;

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

  @OneToMany(() => Lesson, (lesson) => lesson.teacher)
  lessons: Lesson[];

  @OneToMany(() => Exam, (exam) => exam.teacher)
  exams: Exam[];

  @OneToMany(
    () => MeetingSchedule,
    (meetingSchedule) => meetingSchedule.teacher,
  )
  meetingSchedules: MeetingSchedule[];

  @OneToMany(() => Announcement, (announcement) => announcement.teacher)
  announcements: Announcement[];
}
