import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityCategoryLevel } from '../enums/activity.enum';
import { Activity } from './activity.entity';
import { ActivityCategoryQuestion } from './activity-category-question.entity';
import { ActivityCategoryTypePoint } from './activity-category-type-point.entity';
import { ActivityCategoryTypeTime } from './activity-category-type-time.entity';
import { ActivityCategoryTypeStage } from './activity-category-type-stage.entity';
import { ActivityCategoryCompletion } from './activity-category-completion.entity';

@Entity()
export class ActivityCategory extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ActivityCategoryLevel,
  })
  level: ActivityCategoryLevel;

  @Column({ type: 'boolean', default: false })
  randomizeQuestions: boolean;

  @Column({ type: 'int' })
  visibleQuestionsCount: number;

  @ManyToOne(() => Activity, (activity) => activity.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  activity: Activity;

  @OneToMany(
    () => ActivityCategoryQuestion,
    (activityCategoryQuestion) => activityCategoryQuestion.activityCategory,
    {
      cascade: true,
    },
  )
  questions: ActivityCategoryQuestion[];

  @OneToOne(
    () => ActivityCategoryTypePoint,
    (activityCategoryTypePoint) => activityCategoryTypePoint.activityCategory,
    {
      cascade: true,
    },
  )
  typePoint: ActivityCategoryTypePoint;

  @OneToOne(
    () => ActivityCategoryTypeTime,
    (activityCategoryTypeTime) => activityCategoryTypeTime.activityCategory,
    {
      cascade: true,
    },
  )
  typeTime: ActivityCategoryTypeTime;

  @OneToOne(
    () => ActivityCategoryTypeStage,
    (activityCategoryTypeStage) => activityCategoryTypeStage.activityCategory,
    {
      cascade: true,
    },
  )
  typeStage: ActivityCategoryTypeStage;

  @OneToMany(
    () => ActivityCategoryCompletion,
    (activityCategoryCompletion) => activityCategoryCompletion.activityCategory,
  )
  completions: ActivityCategoryCompletion[];
}
