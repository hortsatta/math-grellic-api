import { Entity, Index, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ActivityCategoryCompletion } from './activity-category-completion.entity';
import { ActivityCategoryQuestion } from './activity-category-question.entity';
import { ActivityCategoryQuestionChoice } from './activity-category-question-choice.entity';

@Entity()
export class ActivityCategoryCompletionQuestionAnswer extends BaseEntity {
  @Index()
  @ManyToOne(
    () => ActivityCategoryCompletion,
    (activityCategoryCompletion) => activityCategoryCompletion.questionAnswers,
    {
      onDelete: 'CASCADE',
    },
  )
  completion: ActivityCategoryCompletion;

  @Index()
  @ManyToOne(
    () => ActivityCategoryQuestion,
    (activityCategoryQuestion) => activityCategoryQuestion.completionAnswer,
  )
  question: ActivityCategoryQuestion;

  @Index()
  @ManyToOne(
    () => ActivityCategoryQuestionChoice,
    (activityCategoryQuestionChoice) =>
      activityCategoryQuestionChoice.questionAnswers,
    { nullable: true },
  )
  selectedQuestionChoice: ActivityCategoryQuestionChoice;
}
