import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { LessonSchedule } from '#/modules/lesson/entities/lesson-schedule.entity';
import { User } from './user.entity';
import { UserAccount as UserAccountEntity } from './user-account.entity';
import { TeacherUserAccount } from './teacher-user-account.entity';
import { LessonCompletion } from '#/modules/lesson/entities/lesson-completion.entity';

@Entity()
export class StudentUserAccount extends UserAccountEntity {
  @Column({ type: 'text', nullable: true })
  aboutMe: string;

  @OneToOne(() => User, (user) => user.studentUserAccount)
  @JoinColumn()
  user: User;

  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.students,
  )
  @JoinColumn()
  teacherUser: TeacherUserAccount;

  @ManyToMany(() => LessonSchedule, (lessonSchedule) => lessonSchedule.students)
  lessonSchedules: LessonSchedule[];

  @OneToMany(
    () => LessonCompletion,
    (lessonCompletion) => lessonCompletion.student,
  )
  lessonCompletions: LessonCompletion[];
}
