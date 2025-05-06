import {
  BadRequestException,
  forwardRef,
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
  LessThan,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import slugify from 'slugify';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import {
  AuditFeatureType,
  AuditUserAction,
} from '#/modules/audit-log/enums/audit-log.enum';
import { UserApprovalStatus, UserRole } from '#/modules/user/enums/user.enum';
import { AuditLogService } from '#/modules/audit-log/audit-log.service';
import { AdminUserService } from '#/modules/user/services/admin-user.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';
import { SchoolYearResponse } from '../models/school-year.model';
import { SchoolYear } from '../entities/school-year.entity';
import { SchoolYearCreateDto } from '../dtos/school-year-create.dto';
import { SchoolYearUpdateDto } from '../dtos/school-year-update.dto';
import { SchoolYearEnrollmentService } from './school-year-enrollment.service';

@Injectable()
export class SchoolYearService {
  constructor(
    @InjectRepository(SchoolYear)
    private readonly repo: Repository<SchoolYear>,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject(AdminUserService)
    private readonly adminUserService: AdminUserService,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
    @Inject(forwardRef(() => SchoolYearEnrollmentService))
    private readonly syEnrollmentService: SchoolYearEnrollmentService,
  ) {}

  async validateUpsert(
    schoolYearDto: SchoolYearCreateDto | SchoolYearUpdateDto,
    slug?: string,
  ) {
    const currentDateTime = dayjs().toDate();

    const {
      startDate,
      endDate,
      enrollmentStartDate,
      enrollmentEndDate,
      gracePeriodEndDate,
    } = schoolYearDto;

    // Check start and end date if valid
    if (
      dayjs(startDate).isAfter(endDate) ||
      dayjs(enrollmentStartDate).isAfter(enrollmentEndDate) ||
      // School year end date should be after today
      dayjs(endDate).isSameOrBefore(currentDateTime) ||
      // Enrollment start and end date should be between start and end date of school year
      !dayjs(enrollmentStartDate).isBetween(startDate, endDate, 'day', '[]') ||
      !dayjs(enrollmentEndDate).isBetween(startDate, endDate, 'day', '[]') ||
      // Enrollment grace period should not be set before enrollment end date
      (gracePeriodEndDate &&
        dayjs(gracePeriodEndDate).isBefore(enrollmentEndDate))
    ) {
      return { error: new BadRequestException('Date is invalid') };
    }

    // Check for other school years for conflicts
    const hasConflict = await this.repo.count({
      where: {
        startDate: LessThan(endDate),
        endDate: MoreThan(startDate),
        status: RecordStatus.Published,
        ...(slug && { slug: Not(slug) }),
      },
    });

    if (hasConflict) {
      return {
        error: new BadRequestException(
          'Selected date conflicts with another school year',
        ),
      };
    }

    // TODO check for teachers

    // TODO update
    // Check if dates for education content, enrollment, or completions
    // conflicts with updated dates

    return { error: null };
  }

  createTitleAndSlug(
    startDate: Date,
    endDate: Date,
    title?: string,
  ): [string, string] {
    // Generate title if not supplied
    const startYear = dayjs(startDate).year();
    const endYear = dayjs(endDate).year();
    const startMonth = (dayjs(startDate).month() + 1)
      .toString()
      .padStart(2, '0');
    const endMonth = (dayjs(endDate).month() + 1).toString().padStart(2, '0');

    const transformedTitle =
      startYear === endYear
        ? `SY ${startYear}`
        : `SY ${startYear} — ${endYear}`;

    const slug =
      startYear === endYear
        ? `${startMonth} ${endMonth} ${startYear}`
        : `${startYear} ${endYear}`;

    return [title?.trim().length ? title : transformedTitle, slugify(slug)];
  }

  createSchoolYearResponse(
    schoolYear: SchoolYear,
    userId?: number,
  ): Partial<SchoolYearResponse> {
    const today = dayjs().toDate();

    const totalTeacherCount = schoolYear.enrollments.filter(
      (enrollment) =>
        enrollment.approvalStatus ===
          SchoolYearEnrollmentApprovalStatus.Approved &&
        enrollment.user.role === UserRole.Teacher,
    ).length;

    const totalStudentCount = schoolYear.enrollments.filter(
      (enrollment) =>
        enrollment.approvalStatus ===
          SchoolYearEnrollmentApprovalStatus.Approved &&
        enrollment.user.role === UserRole.Student,
    ).length;

    const isDone = dayjs(schoolYear.endDate).isSameOrBefore(today);

    const isEnrolled = schoolYear.enrollments.some(
      (enrollment) => enrollment.user.id === userId,
    );

    const canEnroll = dayjs(today).isBetween(
      schoolYear.enrollmentStartDate,
      schoolYear.gracePeriodEndDate,
      null,
      '[]',
    );

    return {
      ...schoolYear,
      totalTeacherCount,
      totalStudentCount,
      isDone,
      isEnrolled,
      canEnroll,
    };
  }

  async getCurrentSchoolYear(userId?: number) {
    const today = dayjs().toDate();

    const schoolYear = await this.repo.findOne({
      where: {
        status: RecordStatus.Published,
        startDate: LessThanOrEqual(today),
      },
      relations: {
        enrollments: { user: true },
      },
      order: { startDate: 'DESC' },
    });

    if (!schoolYear) {
      return null;
    }

    const transformedSchoolYear = this.createSchoolYearResponse(
      schoolYear,
      userId,
    );

    return { ...transformedSchoolYear, isActive: true };
  }

  async getPaginatedSchoolYears(
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: string,
  ): Promise<[Partial<SchoolYearResponse>[], number]> {
    const generateWhere = (): FindOptionsWhere<SchoolYear> | undefined => {
      if (q?.trim() && status?.trim()) {
        return undefined;
      }

      let baseWhere: FindOptionsWhere<SchoolYear> = {};

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<SchoolYear> => {
      if (!sort) {
        return { startDate: 'DESC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      return { [sortBy]: sortOrder };
    };

    const [schoolYears, schoolYearCount] = await this.repo.findAndCount({
      where: generateWhere(),
      order: generateOrder(),
      relations: {
        enrollments: { user: true },
      },
      skip,
      take,
    });

    const transformedSchoolYears = schoolYears.map((schoolYear) => {
      const totalTeacherCount = schoolYear.enrollments.filter(
        (enrollment) =>
          enrollment.approvalStatus ===
            SchoolYearEnrollmentApprovalStatus.Approved &&
          enrollment.user.role === UserRole.Teacher,
      ).length;

      const totalStudentCount = schoolYear.enrollments.filter(
        (enrollment) =>
          enrollment.approvalStatus ===
            SchoolYearEnrollmentApprovalStatus.Approved &&
          enrollment.user.role === UserRole.Student,
      ).length;

      return { ...schoolYear, totalTeacherCount, totalStudentCount };
    });

    return [transformedSchoolYears, schoolYearCount];
  }

  async getAllByCurrentUserId(userId: number) {
    const today = dayjs().toDate();
    // Get current active school year
    const currentSchoolYear = await this.getCurrentSchoolYear(userId);
    // Get all school years
    const allSchoolYears = await this.repo.find({
      where: {
        status: RecordStatus.Published,
        startDate: LessThanOrEqual(today),
      },
      relations: { enrollments: { user: true } },
      order: { startDate: 'DESC' },
    });

    const userSchoolYears = allSchoolYears.map((schoolYear) => {
      if (schoolYear.id === currentSchoolYear.id) {
        return currentSchoolYear;
      }

      const transformedSchoolYear = this.createSchoolYearResponse(
        schoolYear,
        userId,
      );

      return { ...transformedSchoolYear, isActive: false };
    });

    return userSchoolYears;
  }

  async getOneBySlug(slug: string, userId: number) {
    const schoolYear = await this.repo.findOne({
      where: { slug },
      relations: {
        enrollments: { user: true },
      },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return this.createSchoolYearResponse(schoolYear, userId);
  }

  async getOneById(userId: number, id?: number) {
    const schoolYear = await this.repo.findOne({
      where: { id },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    const currentSchoolYear = await this.getCurrentSchoolYear(userId);

    if (currentSchoolYear?.id === schoolYear.id) {
      return currentSchoolYear;
    }

    // Return school year and check if it is done
    const today = dayjs().toDate();
    const isDone = dayjs(schoolYear.endDate).isSameOrBefore(today);

    return {
      ...schoolYear,
      isActive: false,
      isDone,
    };
  }

  async create(
    schoolYearDto: SchoolYearCreateDto,
    adminId: number,
  ): Promise<SchoolYear> {
    const {
      // Teacher user account
      teacherIds,
      title,
      startDate,
      endDate,
      gracePeriodEndDate,
      ...moreSchoolYearDto
    } = schoolYearDto;

    const { error } = await this.validateUpsert(schoolYearDto);

    if (error) {
      throw error;
    }

    // Validate and get teacher user ids since the teacherIds array has
    // teacher user account ids not user ids
    let teacherUserIds = [];
    if (
      teacherIds != null &&
      moreSchoolYearDto.status === RecordStatus.Published
    ) {
      const teachers = await this.teacherUserService.getAllTeachers(
        teacherIds.length ? teacherIds : undefined,
        undefined,
        UserApprovalStatus.Approved,
      );

      teacherUserIds = teachers.map((teacher) => teacher.user.id);

      const { error } = await this.syEnrollmentService.validateUsers(
        teachers.map((teacher) => teacher.id),
      );

      if (error) {
        throw error;
      }
    }

    const [transformedTitle, slug] = this.createTitleAndSlug(
      startDate,
      endDate,
      title,
    );

    const schoolYear = this.repo.create({
      ...moreSchoolYearDto,
      startDate,
      endDate,
      // If no grace period date defined then use end date
      gracePeriodEndDate: gracePeriodEndDate ?? endDate,
      title: transformedTitle,
      slug,
    });

    const newSchoolYear = await this.repo.save(schoolYear);

    // Enroll selected teachers to new school year,
    // only enroll if school year is published
    if (
      teacherIds != null &&
      moreSchoolYearDto.status === RecordStatus.Published
    ) {
      const enrollmentDtos = teacherUserIds.map((id) => ({
        schoolYearId: newSchoolYear.id,
        userId: id,
      }));

      await this.syEnrollmentService.createBatch(
        enrollmentDtos,
        SchoolYearEnrollmentApprovalStatus.Approved,
      );
    }

    const admin = await this.adminUserService.getAdminById(adminId);

    this.auditLogService.create(
      {
        actionName: AuditUserAction.createSchoolYear,
        featureId: newSchoolYear.id,
        featureType: AuditFeatureType.schoolYear,
      },
      admin.user.id,
    );

    return newSchoolYear;
  }

  async update(
    slug: string,
    schoolYearDto: SchoolYearUpdateDto,
    adminId: number,
  ): Promise<SchoolYear> {
    const {
      teacherIds,
      title,
      startDate,
      endDate,
      gracePeriodEndDate,
      ...moreSchoolYearDto
    } = schoolYearDto;
    const { error } = await this.validateUpsert(schoolYearDto, slug);

    if (error) {
      throw error;
    }

    const [transformedTitle, transformedSlug] = this.createTitleAndSlug(
      startDate,
      endDate,
      title,
    );

    const schoolYear = await this.repo.findOne({
      where: { slug: transformedSlug },
    });

    let teacherUserIds = [];
    if (
      teacherIds?.length &&
      moreSchoolYearDto.status === RecordStatus.Published &&
      schoolYear.status === RecordStatus.Draft
    ) {
      const teachers = await this.teacherUserService.getAllTeachers(
        teacherIds.length ? teacherIds : undefined,
        undefined,
        UserApprovalStatus.Approved,
      );

      teacherUserIds = teachers.map((teacher) => teacher.user.id);

      const { error } = await this.syEnrollmentService.validateUsers(
        teachers.map((teacher) => teacher.id),
      );

      if (error) {
        throw error;
      }
    }

    const updatedSchoolYear = await this.repo.save({
      ...schoolYear,
      ...moreSchoolYearDto,
      startDate,
      endDate,
      gracePeriodEndDate: gracePeriodEndDate ?? endDate,
      title: transformedTitle,
      slug,
    });

    // Enroll teachers if current status is draft but updated status value is published
    if (
      teacherIds?.length &&
      moreSchoolYearDto.status === RecordStatus.Published &&
      schoolYear.status === RecordStatus.Draft
    ) {
      const enrollmentDtos = teacherUserIds.map((id) => ({
        schoolYearId: updatedSchoolYear.id,
        userId: id,
      }));

      await this.syEnrollmentService.createBatch(
        enrollmentDtos,
        SchoolYearEnrollmentApprovalStatus.Approved,
      );
    }

    const admin = await this.adminUserService.getAdminById(adminId);

    this.auditLogService.create(
      {
        actionName: AuditUserAction.updateSchoolYear,
        featureId: updatedSchoolYear.id,
        featureType: AuditFeatureType.schoolYear,
      },
      admin.user.id,
    );

    return updatedSchoolYear;
  }

  async delete(slug: string, adminId: number): Promise<boolean> {
    // TODO soft delete and check is school year has relationships
    const schoolYear = await this.repo.findOne({
      where: { slug },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    const admin = await this.adminUserService.getAdminById(adminId);

    const result = await this.repo.delete({ id: schoolYear.id });

    this.auditLogService.create(
      {
        actionName: AuditUserAction.updateSchoolYear,
        featureId: schoolYear.id,
        featureType: AuditFeatureType.schoolYear,
      },
      admin.user.id,
    );

    return !!result.affected;
  }
}
