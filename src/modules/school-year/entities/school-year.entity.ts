import { Column, Entity, OneToMany } from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Lesson } from '#/modules/lesson/entities/lesson.entity';
import { Exam } from '#/modules/exam/entities/exam.entity';
import { Activity } from '#/modules/activity/entities/activity.entity';
import { MeetingSchedule } from '#/modules/schedule/entities/meeting-schedule.entity';
import { Announcement } from '#/modules/announcement/entities/announcement.entity';
import { SchoolYearEnrollment } from './school-year-enrollment.entity';

@Entity()
export class SchoolYear extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.Draft,
  })
  status: RecordStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'timestamp' })
  enrollmentStartDate: Date;

  @Column({ type: 'timestamp' })
  enrollmentEndDate: Date;

  @Column({ type: 'timestamp' })
  gracePeriodEndDate: Date;

  @OneToMany(
    () => SchoolYearEnrollment,
    (enrollment) => enrollment.schoolYear,
    {
      cascade: true,
    },
  )
  enrollments: SchoolYearEnrollment[];

  @OneToMany(() => Lesson, (lesson) => lesson.schoolYear)
  lessons: Lesson[];

  @OneToMany(() => Exam, (exam) => exam.schoolYear)
  exams: Exam[];

  @OneToMany(() => Exam, (exam) => exam.schoolYear)
  activity: Activity[];

  @OneToMany(
    () => MeetingSchedule,
    (meetingSchedule) => meetingSchedule.schoolYear,
  )
  meetingSchedules: MeetingSchedule[];

  @OneToMany(() => Announcement, (announcement) => announcement.schoolYear)
  announcements: Announcement[];
}
