import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  In,
  Not,
  Repository,
} from 'typeorm';

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { RecordStatus } from '#/common/enums/content.enum';
import { UserService } from '../user/user.service';
import {
  ActivityCategoryLevel,
  ActivityCategoryType,
  activityGameType,
} from './enums/activity.enum';
import { Activity } from './entities/activity.entity';
import { ActivityCreateDto } from './dtos/activity-create.dto';
import { ActivityUpdateDto } from './dtos/activity-update.dto';
import { ActivityCategoryQuestionUpdateDto } from './dtos/activity-category-question-update.dto';
import { ActivityCategory } from './entities/activity-category.entity';
import { ActivityCategoryQuestion } from './entities/activity-category-question.entity';
import { ActivityCategoryQuestionChoice } from './entities/activity-category-question-choice.entity';
import { ActivityCategoryCompletionCreateDto } from './dtos/activity-category-completion-create.dto';
import { ActivityCategoryCompletionUpdateDto } from './dtos/activity-category-completion-update.dto';
import { ActivityCategoryCompletion } from './entities/activity-category-completion.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityCategory)
    private readonly activityCategoryRepo: Repository<ActivityCategory>,
    @InjectRepository(ActivityCategoryQuestion)
    private readonly activityCategoryQuestionRepo: Repository<ActivityCategoryQuestion>,
    @InjectRepository(ActivityCategoryQuestionChoice)
    private readonly activityCategoryQuestionChoiceRepo: Repository<ActivityCategoryQuestionChoice>,
    @InjectRepository(ActivityCategoryCompletion)
    private readonly activityCategoryCompletionRepo: Repository<ActivityCategoryCompletion>,
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

  async getPaginationTeacherActivitiesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: string,
  ): Promise<[Activity[], number]> {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Activity> = {
        teacher: { id: teacherId },
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<Activity> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      return { [sortBy]: sortOrder };
    };

    const result = await this.activityRepo.findAndCount({
      where: generateWhere(),
      relations: {
        categories: { typePoint: true, typeTime: true, typeStage: true },
      },
      order: generateOrder(),
      skip,
      take,
    });

    // Sort categories by level in ascending order
    const sortedActivities = result[0].map((activity) => {
      if (!activity.categories?.length) {
        return activity;
      }

      const sortedCategories = activity.categories.sort(
        (catA, catB) => catA.level - catB.level,
      );

      return {
        ...activity,
        categories: sortedCategories,
      };
    });

    return [sortedActivities, result[1]];
  }

  async getActivitySnippetsByTeacherId(
    teacherId: number,
    take = 3,
  ): Promise<Activity[]> {
    const activities = await this.activityRepo.find({
      where: { teacher: { id: teacherId } },
      relations: {
        categories: { typePoint: true, typeTime: true, typeStage: true },
      },
    });

    const draftActivities = activities.filter(
      (activity) => activity.status === RecordStatus.Draft,
    );

    if (draftActivities.length >= take) {
      return draftActivities.slice(0, take);
    }

    const publishedActivities = activities.filter(
      (activity) => activity.status === RecordStatus.Published,
    );

    const targetActivities = [...draftActivities, ...publishedActivities];

    const lastIndex = !!targetActivities.length
      ? targetActivities.length > take
        ? take
        : targetActivities.length
      : 0;

    return targetActivities.slice(0, lastIndex);
  }

  async getAllByStudentId(studentId: number): Promise<Activity[]> {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return this.activityRepo.find({
      where: { teacher: { id: teacher.id }, status: RecordStatus.Published },
      relations: { categories: { completions: true } },
    });
  }

  getTeacherActivitiesByTeacherId(
    teacherId: number,
    activityIds?: number[],
    q?: string,
    status?: string,
    withCompletions?: boolean,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Activity> = {
        teacher: { id: teacherId },
      };

      if (activityIds?.length) {
        baseWhere = { ...baseWhere, id: In(activityIds) };
      }

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    return this.activityRepo.find({
      where: generateWhere(),
      order: { orderNumber: 'ASC' },
      relations: { categories: { completions: withCompletions } },
    });
  }

  async getOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Activity> = {
        slug,
        teacher: { id: teacherId },
      };

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const activity = await this.activityRepo.findOne({
      where: generateWhere(),
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
      order: {
        categories: {
          level: 'ASC',
          questions: { orderNumber: 'ASC', choices: { orderNumber: 'ASC' } },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async getActivitiesWithCompletionsByStudentIdAndTeacherId(
    studentId: number,
    teacherId: number,
  ): Promise<Activity[]> {
    const activities = await this.activityRepo.find({
      where: {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      },
      relations: {
        categories: { completions: true },
      },
    });

    const transformedActivities = activities.map((activity) => {
      const categories = activity.categories.map((cat) => {
        const completions = cat.completions
          .filter((completion) => completion.student.id === studentId)
          .sort(
            (comA, comB) =>
              comB.submittedAt.valueOf() - comA.submittedAt.valueOf(),
          );

        return {
          ...cat,
          completions: completions.length ? [completions[0]] : [],
        };
      });

      return {
        ...activity,
        categories,
      };
    });

    return transformedActivities;
  }

  async validateUpsert(
    activityDto: ActivityCreateDto | ActivityUpdateDto,
    teacherId: number,
    slug?: string,
  ) {
    if (!slug?.trim()) {
      return this.validateCreateActivity(
        activityDto as ActivityCreateDto,
        teacherId,
      );
    }

    // Find activity, throw error if none found
    const activity = await this.activityRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
    });

    return this.validateUpdateActivity(
      activityDto as ActivityUpdateDto,
      slug,
      activity,
      teacherId,
    );
  }

  async create(
    activityDto: ActivityCreateDto,
    teacherId: number,
  ): Promise<Activity> {
    const { categories, game, ...moreActivityDto } = activityDto;

    await this.validateCreateActivity(activityDto, teacherId);

    // Transform categories base on game type
    const transformedCategories = categories.map(
      ({
        pointsPerQuestion,
        durationSeconds,
        correctAnswerCount,
        totalStageCount,
        ...moreCategory
      }) => {
        const { type: gameType } = activityGameType[game];

        if (gameType === ActivityCategoryType.Point) {
          return {
            ...moreCategory,
            typePoint: {
              pointsPerQuestion,
              durationSeconds,
            },
          };
        } else if (gameType === ActivityCategoryType.Time) {
          return {
            ...moreCategory,
            typeTime: { correctAnswerCount },
          };
        } else {
          return {
            ...moreCategory,
            typeStage: { totalStageCount },
          };
        }
      },
    );

    // Create activity entity and save it
    const activity = this.activityRepo.create({
      ...moreActivityDto,
      game: activityGameType[game],
      categories: transformedCategories,
      teacher: { id: teacherId },
    });
    const { id } = await this.activityRepo.save(activity);

    // Manually query newly created activity since relations aren't returned on creation
    return await this.activityRepo.findOne({
      where: { id },
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
      order: { categories: { level: 'ASC' } },
    });
  }

  async update(
    slug: string,
    activityDto: ActivityUpdateDto,
    teacherId: number,
  ): Promise<Activity> {
    const { categories, game, ...moreActivityDto } = activityDto;

    // Find activity, throw error if none found
    const activity = await this.activityRepo.findOne({
      where: { slug, teacher: { id: teacherId } },
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
    });

    await this.validateUpdateActivity(activityDto, slug, activity, teacherId);

    // Delete questions not included in request
    for (const cat of categories) {
      const sourceCategory = activity.categories.find((c) => c.id === cat.id);
      await this.deleteActivityCategoryQuestions(cat.questions, sourceCategory);
    }

    // Transform categories base on game type
    const transformedCategories = categories.map(
      ({
        pointsPerQuestion,
        durationSeconds,
        correctAnswerCount,
        totalStageCount,
        ...moreCategory
      }) => {
        const { type: gameType } = activityGameType[game];

        const sourceCategory = activity.categories.find(
          (c) => c.id === moreCategory.id,
        );

        if (gameType === ActivityCategoryType.Point) {
          return {
            ...moreCategory,
            typePoint: {
              ...sourceCategory.typePoint,
              pointsPerQuestion,
              durationSeconds,
            },
            typeTime: undefined,
          };
        } else if (gameType === ActivityCategoryType.Time) {
          return {
            ...moreCategory,
            typeTime: { ...sourceCategory.typeTime, correctAnswerCount },
          };
        } else {
          return {
            ...moreCategory,
            typeStage: { ...sourceCategory.typeStage, totalStageCount },
          };
        }
      },
    );

    // Update activity
    const { id } = await this.activityRepo.save({
      ...activity,
      ...moreActivityDto,
      game: activityGameType[game],
      categories: transformedCategories,
    });

    // Manually query newly created activity since relations aren't returned on creation
    return await this.activityRepo.findOne({
      where: { id },
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
      order: { categories: { level: 'ASC' } },
    });
  }

  async deleteBySlug(slug: string, teacherId: number): Promise<boolean> {
    const activity = await this.getOneBySlugAndTeacherId(slug, teacherId);

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const categoryIds = activity.categories.map((c) => c.id);

    // Abort if activity had completions
    const hasCompletion = !!(await this.activityCategoryCompletionRepo.count({
      where: { activityCategory: { id: In(categoryIds) } },
    }));
    if (hasCompletion) {
      throw new BadRequestException('Cannot delete activity');
    }

    const result = await this.activityRepo.delete({ slug });
    return !!result.affected;
  }

  async deleteActivityCategoryQuestions(
    questions: ActivityCategoryQuestionUpdateDto[],
    sourceCategory: ActivityCategory,
  ) {
    const targetQuestionIds = questions.filter((q) => !!q.id).map((q) => q.id);

    // Delete questions not included in update
    const questionsToDelete = sourceCategory.questions.filter(
      (q) => !targetQuestionIds.includes(q.id),
    );
    await this.activityCategoryQuestionRepo.remove(questionsToDelete);

    // Delete choices not included in update
    await Promise.all(
      questions
        .filter((q) => !!q.id)
        .map(async (targetQuestion) => {
          const currentQuestion = sourceCategory.questions.find(
            (q) => q.id === targetQuestion.id,
          );

          const targetChoiceIds = targetQuestion.choices
            .filter((c) => !!c.id)
            .map((c) => c.id);

          // Delete questions not included in update
          const choicesToDelete = currentQuestion.choices.filter(
            (c) => !targetChoiceIds.includes(c.id),
          );
          await this.activityCategoryQuestionChoiceRepo.remove(choicesToDelete);
        }),
    );
  }

  // STUDENT

  async getStudentActivitiesByStudentId(studentId: number, q?: string) {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new BadRequestException('Student does not exist');
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

  async getOneBySlugAndStudentId(slug: string, studentId: number) {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new BadRequestException('Student does not exist');
    }

    const activity = await this.activityRepo.findOne({
      where: { slug, teacher: { id: teacher.id } },
      relations: {
        categories: {
          questions: { choices: true },
          typePoint: true,
          typeTime: true,
          typeStage: true,
        },
      },
      order: {
        categories: {
          level: 'ASC',
          questions: { orderNumber: 'ASC', choices: { orderNumber: 'ASC' } },
        },
      },
    });

    if (!activity) {
      throw new BadRequestException('Activity does not exist');
    }

    const transformedActivity = await this.generateActivityWithCompletions(
      activity,
      studentId,
    );

    const studentRankings = await this.generateActivityRankings(
      activity,
      teacher.id,
    );

    const { rank } = studentRankings.find(
      (data) => data.studentId === studentId,
    );

    return {
      ...transformedActivity,
      rank,
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

  // MISC

  async validateCreateActivity(
    activityDto: ActivityCreateDto,
    teacherId: number,
  ) {
    const { orderNumber, categories } = activityDto;

    // Validate activity order number if unique for current teacher user
    const orderNumberCount = await this.activityRepo.count({
      where: {
        orderNumber: orderNumber,
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Activity number is already present');
    }

    // Check for duplicate category levels, throw error if true
    Object.keys(ActivityCategoryLevel).map((key) => {
      const levelCount = categories.filter(
        (c) => c.level === ActivityCategoryLevel[key],
      ).length;

      if (levelCount > 1) {
        throw new BadRequestException('Duplicate category level');
      }
    });

    // Check if all questions have atleast one isCorrect choice
    categories.forEach(({ questions }) => {
      questions.forEach((question) => {
        const isCorrectChoice = question.choices.find(
          (choice) => choice.isCorrect,
        );
        if (!isCorrectChoice) {
          throw new BadRequestException(
            'Question should have at least 1 correct choice',
          );
        }
      });
    });
  }

  async validateUpdateActivity(
    activityDto: ActivityUpdateDto,
    slug: string,
    activity: Activity,
    teacherId: number,
  ) {
    const { orderNumber, categories } = activityDto;

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // TODO cancel or clear completion if exist

    // Validate activity order number if unique for current teacher user
    // Except order number of target activity
    const orderNumberCount = await this.activityRepo.count({
      where: {
        orderNumber: orderNumber,
        slug: Not(slug),
        teacher: { id: teacherId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Activity number is already present');
    }

    // Check for duplicate category levels, throw error if true
    Object.keys(ActivityCategoryLevel).map((key) => {
      const levelCount = categories.filter(
        (c) => c.level === ActivityCategoryLevel[key],
      ).length;

      if (levelCount > 1) {
        throw new BadRequestException('Duplicate category level');
      }
    });

    // Check if all questions have atleast one isCorrect choice
    categories.forEach(({ questions }) => {
      questions.forEach((question) => {
        const isCorrectChoice = question.choices.find(
          (choice) => choice.isCorrect,
        );
        if (!isCorrectChoice) {
          throw new BadRequestException(
            'Question should have at least 1 correct choice',
          );
        }
      });
    });
  }

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
          completions: !!completions.length ? completions[0] : [],
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
          completions: !!completions.length ? completions[0] : [],
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
              completions: !!completions.length ? completions[0] : [],
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
}
