import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UploadModule } from '../upload/upload.module';
import { UserModule } from '../user/user.module';
import { SchoolYearModule } from '../school-year/school-year.module';
import { ActivityController } from './activity.controller';
import { ActivitySubscriber } from './subscribers/activity.subscriber';
import { Activity } from './entities/activity.entity';
import { ActivityCategory } from './entities/activity-category.entity';
import { ActivityCategoryQuestion } from './entities/activity-category-question.entity';
import { ActivityCategoryQuestionChoice } from './entities/activity-category-question-choice.entity';
import { ActivityCategoryTypePoint } from './entities/activity-category-type-point.entity';
import { ActivityCategoryTypeTime } from './entities/activity-category-type-time.entity';
import { ActivityService } from './services/activity.service';
import { TeacherActivityService } from './services/teacher-activity.service';
import { StudentActivityService } from './services/student-activity.service';
import { ActivityCategoryCompletion } from './entities/activity-category-completion.entity';
import { ActivityCategoryCompletionQuestionAnswer } from './entities/activity-category-completion-question-answer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityCategory,
      ActivityCategoryQuestion,
      ActivityCategoryQuestionChoice,
      ActivityCategoryTypePoint,
      ActivityCategoryTypeTime,
      ActivityCategoryCompletion,
      ActivityCategoryCompletionQuestionAnswer,
    ]),
    UploadModule,
    UserModule,
    SchoolYearModule,
  ],
  controllers: [ActivityController],
  providers: [
    ActivityService,
    TeacherActivityService,
    StudentActivityService,
    ActivitySubscriber,
  ],
  exports: [ActivityService, TeacherActivityService, StudentActivityService],
})
export class ActivityModule {}
