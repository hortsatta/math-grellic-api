import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { ExActTextType } from '#/common/enums/content.enum';
import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Exam } from './exam.entity';
import { ExamQuestionChoice } from './exam-question-choice.entity';
import { ExamCompletionQuestionAnswer } from './exam-completion-question-answer.entity';

@Entity()
export class ExamQuestion extends BaseEntity {
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
