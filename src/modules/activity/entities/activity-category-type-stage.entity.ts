import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityCategory } from './activity-category.entity';

@Entity()
export class ActivityCategoryTypeStage extends BaseEntity {
  @Column({ type: 'int' })
  totalStageCount: number;

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
