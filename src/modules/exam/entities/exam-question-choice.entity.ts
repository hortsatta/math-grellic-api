import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { ExActTextType } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ExamQuestion } from './exam-question.entity';
import { ExamCompletionQuestionAnswer } from './exam-completion-question-answer.entity';

@Entity()
export class ExamQuestionChoice extends BaseEntity {
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

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @ManyToOne(() => ExamQuestion, (examQuestion) => examQuestion.choices, {
    onDelete: 'CASCADE',
  })
  question: ExamQuestion;

  @OneToMany(
    () => ExamCompletionQuestionAnswer,
    (examCompletionQuestionAnswer) =>
      examCompletionQuestionAnswer.selectedQuestionChoice,
  )
  questionAnswers: ExamCompletionQuestionAnswer[];
}
