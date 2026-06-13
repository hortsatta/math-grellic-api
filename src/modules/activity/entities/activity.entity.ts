import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { RecordStatus } from '#/common/enums/content.enum';
import { SchoolYear } from '#/modules/school-year/entities/school-year.entity';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { ActivityCategory } from './activity-category.entity';

@Entity()
export class Activity extends BaseEntity {
  @Index()
  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.Draft,
  })
  status: RecordStatus;

  @Index()
  @Column({ type: 'int' })
  orderNumber: number;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({
    type: 'jsonb',
  })
  game: { name: string; type: string };

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @OneToMany(
    () => ActivityCategory,
    (activityCategory) => activityCategory.activity,
    {
      cascade: true,
    },
  )
  categories: ActivityCategory[];

  @Index()
  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.activities,
  )
  @JoinColumn()
  teacher: TeacherUserAccount;

  @Index()
  @ManyToOne(() => SchoolYear, (schoolYear) => schoolYear.activity)
  @JoinColumn()
  schoolYear: SchoolYear;
}
