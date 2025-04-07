import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RecordStatus } from '#/common/enums/content.enum';
import { UserService } from '#/modules/user/user.service';
import { ActivityCategoryType } from '../enums/activity.enum';
import { Activity } from '../entities/activity.entity';
import { ActivityCategory } from '../entities/activity-category.entity';
import { ActivityCategoryCompletion } from '../entities/activity-category-completion.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
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

  async getOneBySlugAndStudentId(slug: string, studentId: number) {
    const teacher = await this.userService.getTeacherByStudentId(studentId);

    if (!teacher) {
      throw new BadRequestException('Student not found');
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
      throw new BadRequestException('Activity not found');
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
        categories: { completions: { student: true } },
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
}
