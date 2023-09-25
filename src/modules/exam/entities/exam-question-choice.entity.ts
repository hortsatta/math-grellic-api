import { Column, Entity, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity()
export class ExamQuestionChoice extends BaseEntity {
  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @ManyToOne(() => ExamQuestion, (examQuestion) => examQuestion.choices, {
    onDelete: 'CASCADE',
  })
  question: ExamQuestion;
}
