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
import { UserService } from '#/modules/user/user.service';
import {
  ActivityCategoryLevel,
  ActivityCategoryType,
  activityGameType,
} from '../enums/activity.enum';
import { Activity } from '../entities/activity.entity';
import { ActivityCreateDto } from '../dtos/activity-create.dto';
import { ActivityUpdateDto } from '../dtos/activity-update.dto';
import { ActivityCategoryQuestionUpdateDto } from '../dtos/activity-category-question-update.dto';
import { ActivityCategory } from '../entities/activity-category.entity';
import { ActivityCategoryQuestion } from '../entities/activity-category-question.entity';
import { ActivityCategoryQuestionChoice } from '../entities/activity-category-question-choice.entity';
import { ActivityCategoryCompletion } from '../entities/activity-category-completion.entity';

@Injectable()
export class TeacherActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityCategoryQuestion)
    private readonly activityCategoryQuestionRepo: Repository<ActivityCategoryQuestion>,
    @InjectRepository(ActivityCategoryQuestionChoice)
    private readonly activityCategoryQuestionChoiceRepo: Repository<ActivityCategoryQuestionChoice>,
    @InjectRepository(ActivityCategoryCompletion)
    private readonly activityCategoryCompletionRepo: Repository<ActivityCategoryCompletion>,
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

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
}
