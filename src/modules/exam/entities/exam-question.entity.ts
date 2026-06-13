import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Exam } from './exam.entity';
import { ExamQuestionChoice } from './exam-question-choice.entity';
import { ExamCompletionQuestionAnswer } from './exam-completion-question-answer.entity';

@Entity()
export class ExamQuestion extends BaseEntity {
  @Index()
  @Column({ type: 'int' })
  orderNumber: number;

  @Column({ type: 'text' })
  text: string;

  @Index()
  @ManyToOne(() => Exam, (exam) => exam.questions, {
    onDelete: 'CASCADE',
  })
  exam: Exam;

  @OneToMany(
    () => ExamQuestionChoice,
    (examQuestionChoice) => examQuestionChoice.question,
    { cascade: true },
  )
  choices: ExamQuestionChoice[];

  @OneToMany(
    () => ExamCompletionQuestionAnswer,
    (examCompletionQuestionAnswer) => examCompletionQuestionAnswer.question,
  )
  completionAnswer: ExamCompletionQuestionAnswer[];
}
