import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Exam } from './exam.entity';
import { ExamCompletionQuestionAnswer } from './exam-completion-question-answer.entity';

@Entity()
export class ExamCompletion extends BaseEntity {
  @Column({ type: 'int', nullable: true, default: null })
  score: number;

  @CreateDateColumn({ type: 'timestamp' })
  submittedAt: Date;

  @ManyToOne(() => Exam, (exam) => exam.completions, {
    onDelete: 'CASCADE',
  })
  exam: Exam;

  @OneToMany(
    () => ExamCompletionQuestionAnswer,
    (examCompletionQuestionAnswer) => examCompletionQuestionAnswer.completion,
    { cascade: true },
  )
  questionAnswers: ExamCompletionQuestionAnswer[];

  @ManyToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.examCompletions,
  )
  student: StudentUserAccount;
}
