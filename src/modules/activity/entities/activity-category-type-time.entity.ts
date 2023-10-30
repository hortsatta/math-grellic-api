import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityCategory } from './activity-category.entity';

@Entity()
export class ActivityCategoryTypeTime extends BaseEntity {
  @Column({ type: 'int' })
  correctAnswerCount: number;

  @OneToOne(
    () => ActivityCategory,
    (activityCategory) => activityCategory.typeTime,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  activityCategory: ActivityCategory;
}
