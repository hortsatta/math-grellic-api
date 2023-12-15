import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { ExActTextType } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
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
    enum: ExActTextType,
    default: ExActTextType.Text,
  })
  textType: ExActTextType;

  @Column({ type: 'int', nullable: true })
  stageNumber: number;

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
