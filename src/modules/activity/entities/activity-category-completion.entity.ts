import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { ActivityCategory } from './activity-category.entity';
import { ActivityCategoryCompletionQuestionAnswer } from './activity-category-completion-question-answer.entity';

@Entity()
export class ActivityCategoryCompletion extends BaseEntity {
  @Column({ type: 'int', nullable: true, default: null })
  score: number;

  @Column({ type: 'int', nullable: true })
  timeCompletedSeconds: number;

  @CreateDateColumn({ type: 'timestamp' })
  submittedAt: Date;

  @ManyToOne(
    () => ActivityCategory,
    (activityCategory) => activityCategory.completions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  activityCategory: ActivityCategory;

  @OneToMany(
    () => ActivityCategoryCompletionQuestionAnswer,
    (activityCategoryCompletionQuestionAnswer) =>
      activityCategoryCompletionQuestionAnswer.completion,
    { cascade: true },
  )
  questionAnswers: ActivityCategoryCompletionQuestionAnswer[];

  @ManyToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.activityCompletions,
  )
  @JoinColumn()
  student: StudentUserAccount;
}
