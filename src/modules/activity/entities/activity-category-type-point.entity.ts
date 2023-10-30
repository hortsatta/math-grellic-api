import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityCategory } from './activity-category.entity';

@Entity()
export class ActivityCategoryTypePoint extends BaseEntity {
  @Column({ type: 'int', default: 1 })
  pointsPerQuestion: number;

  @Column({ type: 'int' })
  durationSeconds: number;

  @OneToOne(
    () => ActivityCategory,
    (activityCategory) => activityCategory.typePoint,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  activityCategory: ActivityCategory;
}
