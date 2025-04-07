import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { UserService } from '#/modules/user/user.service';
import { ActivityCategoryType } from '../enums/activity.enum';
import { Activity } from '../entities/activity.entity';
import { ActivityCategory } from '../entities/activity-category.entity';
import { ActivityCategoryQuestion } from '../entities/activity-category-question.entity';
import { ActivityCategoryCompletionCreateDto } from '../dtos/activity-category-completion-create.dto';
import { ActivityCategoryCompletionUpdateDto } from '../dtos/activity-category-completion-update.dto';
import { ActivityCategoryCompletion } from '../entities/activity-category-completion.entity';

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
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

  async generateActivityRankings(activity: Activity, teacherId: number) {
    const students = await this.userService.getStudentsByTeacherId(teacherId);

    // Remove duplicate category level
    const filteredCategories = activity.categories
      .sort((catA, catB) => catB.updatedAt.valueOf() - catA.updatedAt.valueOf())
      .filter(
        (cat, index, array) =>
          array.findIndex((item) => item.level === cat.level) === index,
      );

    const categoryIds = filteredCategories.map((cat) => cat.id);

    const studentData = await Promise.all(
      students.map(async ({ id: studentId }) => {
        const targetCompletions =
          await this.activityCategoryCompletionRepo.find({
            where: {
              activityCategory: { id: In(categoryIds) },
              student: { id: studentId },
            },
            relations: { activityCategory: true },
          });

        if (activity.game.type === ActivityCategoryType.Point) {
          const completions = filteredCategories.reduce((total, cat) => {
            const list = targetCompletions
              .filter((com) => com.activityCategory.id === cat.id)
              .sort(
                (comA, comB) =>
                  comA.timeCompletedSeconds - comB.timeCompletedSeconds,
              )
              .sort((comA, comB) => comB.score - comA.score);

            if (list.length) {
              total.push(list[0]);
            }

            return total;
          }, []);

          // Combine the completion score in each category
          const score = completions.length
            ? completions.reduce((total, com) => total + com.score, 0)
            : null;

          return {
            studentId,
            score,
            completions,
          };
        } else if (activity.game.type === ActivityCategoryType.Time) {
          const completions = filteredCategories.reduce((total, cat) => {
            const list = targetCompletions
              .filter((com) => com.activityCategory.id === cat.id)
              .sort(
                (comA, comB) =>
                  comA.timeCompletedSeconds - comB.timeCompletedSeconds,
              );

            if (list.length) {
              total.push(list[0]);
            }

            return total;
          }, []);

          const score = completions.length
            ? completions.reduce(
                (total, com) => total + com.timeCompletedSeconds,
                0,
              ) / completions.length
            : null;

          return {
            studentId,
            score,
            completions,
          };
        } else {
          const targetCategory = filteredCategories.length
            ? filteredCategories[0]
            : null;

          const completions = targetCompletions
            .filter((com) => com.activityCategory.id === targetCategory.id)
            .sort(
              (comA, comB) =>
                comA.timeCompletedSeconds - comB.timeCompletedSeconds,
            )
            .sort((comA, comB) => comB.score - comA.score);

          return {
            studentId,
            score: completions.length ? completions[0].score : null,
            completions,
          };
        }
      }),
    );

    // Calculate student rankings
    if (activity.game.type === ActivityCategoryType.Point) {
      const completeStudentData = studentData
        .filter((data) => data.score != null)
        .sort((dataA, dataB) => dataB.score - dataA.score)
        .map((data, index) => ({ ...data, rank: index + 1 }));

      const incompleteStudentData = studentData
        .filter((data) => data.score == null)
        .map((data) => ({ ...data, rank: null }));

      return [...completeStudentData, ...incompleteStudentData];
    } else if (activity.game.type === ActivityCategoryType.Time) {
      const completeStudentData = studentData
        .filter((data) => data.score != null && data.completions.length >= 3)
        .sort((dataA, dataB) => dataA.score - dataB.score)
        .map((data, index) => ({ ...data, rank: index + 1 }));

      const incompleteStudentData = studentData
        .filter((data) => data.score == null || data.completions.length < 3)
        .map((data) => ({ ...data, rank: null }));

      return [...completeStudentData, ...incompleteStudentData];
    } else {
      const completeStudentData = studentData
        .filter((data) => data.score != null)
        .sort((dataA, dataB) => dataB.score - dataA.score)
        .map((data, index) => ({ ...data, rank: index + 1 }));

      const incompleteStudentData = studentData
        .filter((data) => data.score == null)
        .map((data) => ({ ...data, rank: null }));

      return [...completeStudentData, ...incompleteStudentData];
    }
  }

  async generateActivityWithCompletions(activity: Activity, studentId: number) {
    // Remove duplicate category level
    const filteredCategories = activity.categories
      .sort((catA, catB) => catB.updatedAt.valueOf() - catA.updatedAt.valueOf())
      .filter(
        (cat, index, array) =>
          array.findIndex((item) => item.level === cat.level) === index,
      );

    const categoryIds = filteredCategories.map((cat) => cat.id);

    const targetCompletions = await this.activityCategoryCompletionRepo.find({
      where: {
        activityCategory: { id: In(categoryIds) },
        student: { id: studentId },
      },
      relations: { activityCategory: true },
    });

    let categories: ActivityCategory[] = [];
    let score = null;

    // Calculate final score base on game type
    // Type point
    if (activity.game.type === ActivityCategoryType.Point) {
      categories = filteredCategories.map((cat) => {
        const completions = targetCompletions
          .filter((com) => com.activityCategory.id === cat.id)
          .sort(
            (comA, comB) =>
              comA.timeCompletedSeconds - comB.timeCompletedSeconds,
          )
          .sort((comA, comB) => comB.score - comA.score);

        return {
          ...cat,
          completions: !!completions.length ? [completions[0]] : [],
        } as ActivityCategory;
      });

      const catWithCompletions = categories.filter(
        (cat) => !!cat.completions.length,
      );

      // Combine the completion score in each category
      if (catWithCompletions.length) {
        score = catWithCompletions.reduce(
          (total, cat) => total + cat.completions[0].score,
          0,
        );
      }
      // Type time
    } else if (activity.game.type === ActivityCategoryType.Time) {
      categories = filteredCategories.map((cat) => {
        const completions = targetCompletions
          .filter((com) => com.activityCategory.id === cat.id)
          .sort(
            (comA, comB) =>
              comA.timeCompletedSeconds - comB.timeCompletedSeconds,
          );

        return {
          ...cat,
          completions: !!completions.length ? [completions[0]] : [],
        } as ActivityCategory;
      });

      const catWithCompletions = categories.filter(
        (cat) => !!cat.completions.length,
      );

      // Get the average time completed
      if (catWithCompletions.length) {
        score =
          catWithCompletions.reduce(
            (total, cat) => total + cat.completions[0].timeCompletedSeconds,
            0,
          ) / catWithCompletions.length;
      }
      // Type stage
    } else {
      const targetCategory = filteredCategories.length
        ? filteredCategories[0]
        : null;

      const completions = targetCompletions
        .filter((com) => com.activityCategory.id === targetCategory.id)
        .sort(
          (comA, comB) => comA.timeCompletedSeconds - comB.timeCompletedSeconds,
        )
        .sort((comA, comB) => comB.score - comA.score);

      categories = targetCategory
        ? [
            {
              ...targetCategory,
              completions: !!completions.length ? [completions[0]] : [],
            } as ActivityCategory,
          ]
        : [];

      const catWithCompletions = categories
        .filter((cat) => !!cat.completions.length)
        .sort(
          (catA, catB) => catB.updatedAt.valueOf() - catA.updatedAt.valueOf(),
        );

      // Get the latest score
      score = catWithCompletions[0]?.completions[0]?.score || null;
    }

    return {
      ...activity,
      categories,
      score,
    };
  }

  async getStudentActivitiesByStudentId(studentId: number, q?: string) {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new BadRequestException('Student not found');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Activity> = {
        teacher: { id: teacher.id },
        status: RecordStatus.Published,
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
        this.generateActivityWithCompletions(activity, studentId),
      ),
    );

    // Get other activity completions
    const otherActivities = await Promise.all(
      otherEntities.map(async (activity) =>
        this.generateActivityWithCompletions(activity, studentId),
      ),
    );

    return {
      featuredActivities,
      otherActivities,
    };
  }

  async createActivityCategoryCompletionBySlugAndStudentId(
    body: ActivityCategoryCompletionCreateDto,
    slug: string,
    categoryId: number,
    studentId: number,
  ) {
    const { questionAnswers, timeCompletedSeconds } = body;

    const activityCategory = await this.activityCategoryRepo.findOne({
      where: {
        id: categoryId,
        activity: { slug, status: RecordStatus.Published },
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

  async updateActivityCategoryCompletionBySlugAndStudentId(
    body: ActivityCategoryCompletionUpdateDto,
    slug: string,
    categoryId: number,
    studentId: number,
  ) {
    const { questionAnswers, timeCompletedSeconds } = body;

    const activityCategory = await this.activityCategoryRepo.findOne({
      where: {
        id: categoryId,
        activity: { slug, status: RecordStatus.Published },
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
