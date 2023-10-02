import { Entity, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { StudentUserAccount } from '#/modules/user/entities/student-user-account.entity';
import { Lesson } from './lesson.entity';

@Entity()
export class LessonCompletion extends BaseEntity {
  @ManyToOne(() => Lesson, (lesson) => lesson.completions, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;

  @ManyToOne(
    () => StudentUserAccount,
    (studentUserAccount) => studentUserAccount.lessonCompletions,
  )
  student: StudentUserAccount;
}
