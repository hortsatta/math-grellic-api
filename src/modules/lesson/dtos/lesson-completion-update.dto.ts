import { IsBoolean } from 'class-validator';

export class LessonCompletionUpdateDto {
  @IsBoolean()
  isCompleted: boolean;
}
