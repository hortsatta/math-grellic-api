import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Exam } from './exam.entity';
import { ExamSchedule } from './exam-schedule.entity';
import { ExamCompletionQuestionAnswer } from './exam-completion-question-answer.entity';

@Entity()
export class ExamCompletion extends BaseEntity {
  @Column({ type: 'int', nullable: true, default: null })
  score: number;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  submittedAt: Date;

  @Index()
  @ManyToOne(() => Exam, (exam) => exam.completions, {
    onDelete: 'CASCADE',
  })
  exam: Exam;

  @Index()
  @ManyToOne(() => ExamSchedule, (examSchedule) => examSchedule.completions)
  schedule: ExamSchedule;

  @OneToMany(
    () => ExamCompletionQuestionAnswer,
    (examCompletionQuestionAnswer) => examCompletionQuestionAnswer.completion,
    { cascade: true },
  )
  questionAnswers: ExamCompletionQuestionAnswer[];

  @Index()
  @ManyToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.examCompletions,
  )
  student: StudentUserAccount;
}
