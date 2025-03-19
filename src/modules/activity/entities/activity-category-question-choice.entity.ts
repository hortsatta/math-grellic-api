import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityTextType } from '../enums/activity.enum';
import { ActivityCategoryQuestion } from './activity-category-question.entity';
import { ActivityCategoryCompletionQuestionAnswer } from './activity-category-completion-question-answer.entity';

@Entity()
export class ActivityCategoryQuestionChoice extends BaseEntity {
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

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @ManyToOne(
    () => ActivityCategoryQuestion,
    (activityCategoryQuestion) => activityCategoryQuestion.choices,
    {
      onDelete: 'CASCADE',
    },
  )
  question: ActivityCategoryQuestion;

  @OneToMany(
    () => ActivityCategoryCompletionQuestionAnswer,
    (activityCategoryCompletionQuestionAnswer) =>
      activityCategoryCompletionQuestionAnswer.selectedQuestionChoice,
  )
  questionAnswers: ActivityCategoryCompletionQuestionAnswer[];
}
