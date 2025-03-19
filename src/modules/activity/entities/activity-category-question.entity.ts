import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityTextType } from '../enums/activity.enum';
import { ActivityCategory } from './activity-category.entity';
import { ActivityCategoryQuestionChoice } from './activity-category-question-choice.entity';
import { ActivityCategoryCompletionQuestionAnswer } from './activity-category-completion-question-answer.entity';

@Entity()
export class ActivityCategoryQuestion extends BaseEntity {
  @Column({ type: 'int' })
  orderNumber: number;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: ActivityTextType,
    default: ActivityTextType.Text,
  })
  textType: ActivityTextType;

  @Column({ type: 'int', nullable: true })
  stageNumber: number;

  @Column({ type: 'text', nullable: true })
  hintText: string;

  @ManyToOne(
    () => ActivityCategory,
    (activityCategory) => activityCategory.questions,
    {
      onDelete: 'CASCADE',
    },
  )
  activityCategory: ActivityCategory;

  @OneToMany(
    () => ActivityCategoryQuestionChoice,
    (activityCategoryQuestionChoice) => activityCategoryQuestionChoice.question,
    { cascade: true },
  )
  choices: ActivityCategoryQuestionChoice[];

  @OneToMany(
    () => ActivityCategoryCompletionQuestionAnswer,
    (activityCategoryCompletionQuestionAnswer) =>
      activityCategoryCompletionQuestionAnswer.question,
  )
  completionAnswer: ActivityCategoryCompletionQuestionAnswer[];
}
