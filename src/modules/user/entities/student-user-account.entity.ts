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
import { ExamSchedule } from '#/modules/exam/entities/exam-schedule.entity';
import { MeetingSchedule } from '#/modules/schedule/entities/meeting-schedule.entity';
import { Announcement } from '#/modules/announcement/entities/announcement.entity';
import { LessonCompletion } from '#/modules/lesson/entities/lesson-completion.entity';
import { ExamCompletion } from '#/modules/exam/entities/exam-completion.entity';
import { ActivityCategoryCompletion } from '#/modules/activity/entities/activity-category-completion.entity';
import { User } from './user.entity';
import { UserAccount as UserAccountEntity } from './user-account.entity';
import { TeacherUserAccount } from './teacher-user-account.entity';

@Entity()
export class StudentUserAccount extends UserAccountEntity {
  @Column({ type: 'text', nullable: true })
  aboutMe: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  messengerLink: string;

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

  @ManyToMany(() => ExamSchedule, (examSchedule) => examSchedule.students)
  examSchedules: ExamSchedule[];

  @ManyToMany(
    () => MeetingSchedule,
    (meetingSchedule) => meetingSchedule.students,
  )
  meetingSchedules: MeetingSchedule[];

  @ManyToMany(() => Announcement, (announcement) => announcement.students)
  announcements: Announcement[];

  @OneToMany(
    () => LessonCompletion,
    (lessonCompletion) => lessonCompletion.student,
  )
  lessonCompletions: LessonCompletion[];

  @OneToMany(() => ExamCompletion, (examCompletion) => examCompletion.student)
  examCompletions: ExamCompletion[];

  @OneToMany(
    () => ActivityCategoryCompletion,
    (activityCategoryCompletion) => activityCategoryCompletion.student,
  )
  activityCompletions: ActivityCategoryCompletion[];
}
