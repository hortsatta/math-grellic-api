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
import { ActivityCategoryCompletion } from './entities/activity-category-completion.entity';

@Injectable()
export class ActivityService {
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

  async getPaginationTeacherActivitiesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = 10,
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
      relations: { categories: { typePoint: true, typeTime: true } },
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

    // Validate activity order number if unique for current teacher user
    const orderNumberCount = await this.activityRepo.count({
      where: {
        orderNumber: moreActivityDto.orderNumber,
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

    // Transform categories base on game type
    const transformedCategories = categories.map(
      ({
        pointsPerQuestion,
        durationSeconds,
        correctAnswerCount,
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
        } else {
          return {
            ...moreCategory,
            typeTime: { correctAnswerCount },
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
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // TODO cancel or clear completion if exist

    // Validate activity order number if unique for current teacher user
    // Except order number of target activity
    const orderNumberCount = await this.activityRepo.count({
      where: {
        orderNumber: moreActivityDto.orderNumber,
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
        } else {
          return {
            ...moreCategory,
            typePoint: undefined,
            typeTime: {
              ...sourceCategory.typeTime,
              correctAnswerCount,
            },
          };
        }
      },
    );

    // Update activity, ignore schedule if previous activity status is published
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
      relations: { categories: { typePoint: true, typeTime: true } },
      order: { orderNumber: 'ASC' },
      take: 2,
    });

    const featuredEntityIds = featuredEntities.map((fe) => fe.id);

    const otherEntities = await this.activityRepo.find({
      where: {
        ...generateWhere(),
        id: Not(In(featuredEntityIds)),
      },
      relations: { categories: { typePoint: true, typeTime: true } },
      order: { orderNumber: 'ASC' },
    });

    // Get featured activity completions
    const featuredActivities = await Promise.all(
      featuredEntities.map(async (activity) => {
        const categoryIds = activity.categories.map((cat) => cat.id);
        const completions = await this.activityCategoryCompletionRepo.find({
          where: { activityCategory: { id: In(categoryIds) } },
          relations: { activityCategory: true },
        });

        const categories = activity.categories.map((cat) => {
          const targetCompletions = completions.find(
            (com) => com.activityCategory.id === cat.id,
          );
          return {
            ...cat,
            completions: targetCompletions,
          };
        });

        return {
          ...activity,
          categories,
        };
      }),
    );

    // Get other activity completions
    const otherActivities = await Promise.all(
      otherEntities.map(async (activity) => {
        const categoryIds = activity.categories.map((cat) => cat.id);
        const completions = await this.activityCategoryCompletionRepo.find({
          where: { activityCategory: { id: In(categoryIds) } },
          relations: { activityCategory: true },
        });

        const categories = activity.categories.map((cat) => {
          const targetCompletions = completions.find(
            (com) => com.activityCategory.id === cat.id,
          );

          return {
            ...cat,
            completions: targetCompletions,
          };
        });

        return {
          ...activity,
          categories,
        };
      }),
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

    const categoryIds = activity.categories.map((cat) => cat.id);
    // Get activity student completions
    const completions = await this.activityCategoryCompletionRepo.find({
      where: { activityCategory: { id: In(categoryIds) } },
      relations: {
        activityCategory: true,
        questionAnswers: { question: true, selectedQuestionChoice: true },
      },
    });
    // Apply completions to categories
    const categories = activity.categories.map((cat) => {
      const targetCompletions = completions.find(
        (com) => com.activityCategory.id === cat.id,
      );

      return {
        ...cat,
        completions: targetCompletions,
      };
    });

    return {
      ...activity,
      categories,
    };
  }
}
