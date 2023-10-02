import { IsBoolean } from 'class-validator';

export class LessonCompletionUpsertDto {
  @IsBoolean()
  isCompleted: boolean;
}
