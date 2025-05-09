import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { ActivityCategoryType } from '../enums/activity.enum';
import { Activity } from '../entities/activity.entity';
import { ActivityCategory } from '../entities/activity-category.entity';
import { ActivityCategoryQuestion } from '../entities/activity-category-question.entity';
import { ActivityCategoryCompletionCreateDto } from '../dtos/activity-category-completion-create.dto';
import { ActivityCategoryCompletionUpdateDto } from '../dtos/activity-category-completion-update.dto';
import { ActivityCategoryCompletion } from '../entities/activity-category-completion.entity';
import { ActivityService } from './activity.service';

@Injectable()
export class StudentActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityCategory)
    private readonly activityCategoryRepo: Repository<ActivityCategory>,
    @InjectRepository(ActivityCategoryQuestion)
    private readonly activityCategoryQuestionRepo: Repository<ActivityCategoryQuestion>,
    @InjectRepository(ActivityCategoryCompletion)
    private readonly activityCategoryCompletionRepo: Repository<ActivityCategoryCompletion>,
    @Inject(ActivityService)
    private readonly activityService: ActivityService,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
  ) {}

  async getStudentActivitiesByStudentId(
    studentId: number,
    q?: string,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const teacher = await this.teacherUserService.getTeacherByStudentId(
      studentId,
      schoolYear.id,
    );

    if (!teacher) {
      throw new BadRequestException('Student not found');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Activity> = {
        teacher: { id: teacher.id },
        status: RecordStatus.Published,
        schoolYear: { id: schoolYear.id },
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      return baseWhere;
    };

    const featuredEntities = await this.activityRepo.find({
      where: { ...generateWhere() },
      relations: {
        categories: { typePoint: true, typeTime: true, typeStage: true },
      },
      order: { orderNumber: 'ASC' },
      take: 2,
    });

    const featuredEntityIds = featuredEntities.map((fe) => fe.id);

    const otherEntities = await this.activityRepo.find({
      where: {
        ...generateWhere(),
        id: Not(In(featuredEntityIds)),
      },
      relations: {
        categories: { typePoint: true, typeTime: true, typeStage: true },
      },
      order: { orderNumber: 'ASC' },
    });

    // Get featured activity completions
    const featuredActivities = await Promise.all(
      featuredEntities.map((activity) =>
        this.activityService.generateActivityWithCompletions(
          activity,
          studentId,
        ),
      ),
    );

    // Get other activity completions
    const otherActivities = await Promise.all(
      otherEntities.map(async (activity) =>
        this.activityService.generateActivityWithCompletions(
          activity,
          studentId,
        ),
      ),
    );

    return {
      featuredActivities,
      otherActivities,
    };
  }

  async createActivityCategoryCompletionByIdAndStudentId(
    body: ActivityCategoryCompletionCreateDto,
    id: number,
    categoryId: number,
    studentId: number,
  ) {
    const { questionAnswers, timeCompletedSeconds } = body;

    const activityCategory = await this.activityCategoryRepo.findOne({
      where: {
        id: categoryId,
        activity: { id, status: RecordStatus.Published },
      },
      relations: {
        activity: true,
        typePoint: true,
        typeTime: true,
        typeStage: true,
      },
    });

    if (!activityCategory) {
      throw new NotFoundException('Activity not available');
    }

    // Delete existing completions of same category id and level
    await this.activityCategoryCompletionRepo.delete({
      activityCategory: {
        id: activityCategory.id,
        level: activityCategory.level,
      },
      student: { id: studentId },
    });

    const categoryQuestions = await this.activityCategoryQuestionRepo.find({
      where: {
        id: In(questionAnswers.map((a) => a.questionId)),
        activityCategory: { id: activityCategory.id },
      },
      relations: { choices: true },
    });

    const correctCount = questionAnswers.reduce(
      (acc, { questionId, selectedQuestionChoiceId }) => {
        if (!questionId || !selectedQuestionChoiceId) {
          return acc;
        }

        const question = categoryQuestions.find((q) => q.id === questionId);
        const choice = question
          ? question.choices.find((c) => c.id === selectedQuestionChoiceId)
          : null;

        return choice.isCorrect ? acc + 1 : acc;
      },
      0,
    );

    const score =
      activityCategory.activity.game.type === ActivityCategoryType.Point
        ? correctCount * activityCategory.typePoint.pointsPerQuestion
        : correctCount;

    const newQuestionAnswers = questionAnswers.map(
      ({ questionId, selectedQuestionChoiceId }) => ({
        question: { id: questionId },
        selectedQuestionChoice: selectedQuestionChoiceId
          ? { id: selectedQuestionChoiceId }
          : null,
      }),
    );

    const completion = this.activityCategoryCompletionRepo.create({
      score,
      timeCompletedSeconds,
      submittedAt: new Date(),
      activityCategory,
      questionAnswers: newQuestionAnswers,
      student: { id: studentId },
    });

    return this.activityCategoryCompletionRepo.save(completion);
  }

  async updateActivityCategoryCompletionByIdAndStudentId(
    body: ActivityCategoryCompletionUpdateDto,
    id: number,
    categoryId: number,
    studentId: number,
  ) {
    const { questionAnswers, timeCompletedSeconds } = body;

    const activityCategory = await this.activityCategoryRepo.findOne({
      where: {
        id: categoryId,
        activity: { id, status: RecordStatus.Published },
      },
      relations: {
        activity: true,
        typePoint: true,
        typeTime: true,
        typeStage: true,
      },
    });

    if (!activityCategory) {
      throw new NotFoundException('Activity not available');
    }

    const categoryQuestions = await this.activityCategoryQuestionRepo.find({
      where: {
        id: In(questionAnswers.map((a) => a.questionId)),
        activityCategory: { id: activityCategory.id },
      },
      relations: { choices: true },
    });

    const correctCount = questionAnswers.reduce(
      (acc, { questionId, selectedQuestionChoiceId }) => {
        if (!questionId || !selectedQuestionChoiceId) {
          return acc;
        }

        const question = categoryQuestions.find((q) => q.id === questionId);
        const choice = question
          ? question.choices.find((c) => c.id === selectedQuestionChoiceId)
          : null;

        return choice.isCorrect ? acc + 1 : acc;
      },
      0,
    );

    const score =
      activityCategory.activity.game.type === ActivityCategoryType.Point
        ? correctCount * activityCategory.typePoint.pointsPerQuestion
        : correctCount;

    const newQuestionAnswers = questionAnswers.map(
      ({ questionId, selectedQuestionChoiceId }) => ({
        question: { id: questionId },
        selectedQuestionChoice: selectedQuestionChoiceId
          ? { id: selectedQuestionChoiceId }
          : null,
      }),
    );

    return this.activityCategoryCompletionRepo.save({
      score,
      timeCompletedSeconds,
      submittedAt: new Date(),
      activityCategory,
      questionAnswers: newQuestionAnswers,
      student: { id: studentId },
    });
  }
}
