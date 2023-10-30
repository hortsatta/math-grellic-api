import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { RecordStatus } from '#/common/enums/content.enum';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { ActivityCategory } from './activity-category.entity';

@Entity()
export class Activity extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.Draft,
  })
  status: RecordStatus;

  @Column({ type: 'int' })
  orderNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
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

  @ManyToOne(
    () => TeacherUserAccount,
    (teacherUserAccount) => teacherUserAccount.exams,
  )
  @JoinColumn()
  teacher: TeacherUserAccount;
}
