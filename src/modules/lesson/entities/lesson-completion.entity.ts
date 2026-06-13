import { Entity, Index, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Lesson } from './lesson.entity';

@Entity()
export class LessonCompletion extends BaseEntity {
  @Index()
  @ManyToOne(() => Lesson, (lesson) => lesson.completions, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;

  @Index()
  @ManyToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.lessonCompletions,
  )
  student: StudentUserAccount;
}
