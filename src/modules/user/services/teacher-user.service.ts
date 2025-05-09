import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { encryptPassword } from '#/common/helpers/password.helper';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { generatePublicId } from '#/modules/user/helpers/user.helper';
import {
  AuditFeatureType,
  AuditUserAction,
} from '#/modules/audit-log/enums/audit-log.enum';
import { SchoolYearEnrollmentApprovalStatus } from '#/modules/school-year/enums/school-year-enrollment.enum';
import { MailerService } from '#/modules/mailer/mailer.service';
import { AuditLogService } from '#/modules/audit-log/audit-log.service';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { UserApprovalStatus, UserRole } from '../enums/user.enum';
import { User } from '../entities/user.entity';
import { TeacherUserAccount } from '../entities/teacher-user-account.entity';
import { TeacherUserCreateDto } from '../dtos/teacher-user-create.dto';
import { TeacherUserUpdateDto } from '../dtos/teacher-user-update.dto';
import { UserApprovalDto } from '../dtos/user-approval.dto';
import { UserService } from './user.service';

@Injectable()
export class TeacherUserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherUserAccount)
    private readonly teacherUserAccountRepo: Repository<TeacherUserAccount>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject(forwardRef(() => SchoolYearService))
    private readonly schoolYearService: SchoolYearService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async getPaginationTeachersByAdminId(
    adminId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: UserApprovalStatus,
    own?: boolean,
  ): Promise<[TeacherUserAccount[], number]> {
    const generateWhere = () => {
      let baseWhere:
        | FindOptionsWhere<TeacherUserAccount>
        | FindOptionsWhere<TeacherUserAccount>[] = {};

      if (own) {
        baseWhere = {
          adminUser: { id: adminId },
        };
      }

      if (status?.trim()) {
        baseWhere = {
          ...baseWhere,
          user: { approvalStatus: In(status.split(',')) },
        };
      }

      if (q?.trim()) {
        baseWhere = [
          { ...baseWhere, firstName: ILike(`%${q}%`) },
          { ...baseWhere, lastName: ILike(`%${q}%`) },
          { ...baseWhere, middleName: ILike(`%${q}%`) },
        ];
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<TeacherUserAccount> => {
      const [sortBy, sortOrder] = sort?.split(',') || [undefined, 'ASC'];

      if (!sortBy || sortBy === 'name') {
        return {
          lastName: sortOrder as FindOptionsOrderValue,
          firstName: sortOrder as FindOptionsOrderValue,
          middleName: sortOrder as FindOptionsOrderValue,
        };
      }

      if (sortBy === 'publicId') {
        return { user: { publicId: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    const results = await this.teacherUserAccountRepo.findAndCount({
      where: generateWhere(),
      relations: { user: true },
      order: generateOrder(),
      skip,
      take,
    });

    const teachers = results[0].map((teacher) => {
      const { publicId, email, approvalStatus } = teacher.user;

      return {
        ...teacher,
        user: { publicId, email, approvalStatus },
      };
    }) as TeacherUserAccount[];

    return [teachers, results[1]];
  }

  async getAssignedTeacherByStudentId(
    id: number,
    schoolYearId?: number,
  ): Promise<Partial<User>> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const user = await this.userRepo.findOne({
      where: {
        approvalStatus: UserApprovalStatus.Approved,
        teacherUserAccount: {
          enrolledStudents: {
            schoolYear: { id: schoolYear.id },
            user: {
              studentUserAccount: { id },
              approvalStatus: UserApprovalStatus.Approved,
            },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
      },
      loadEagerRelations: false,
      relations: { teacherUserAccount: true },
    });

    if (!user) {
      throw new NotFoundException('Teacher not found');
    }

    const {
      email,
      profileImageUrl,
      publicId,
      role,
      teacherUserAccount: {
        aboutMe,
        birthDate,
        educationalBackground,
        emails,
        firstName,
        gender,
        lastName,
        messengerLink,
        middleName,
        phoneNumber,
        socialMediaLinks,
        teachingCertifications,
        teachingExperience,
        website,
      },
    } = user;

    return {
      email,
      profileImageUrl,
      publicId,
      role,
      teacherUserAccount: {
        aboutMe,
        birthDate,
        educationalBackground,
        emails,
        firstName,
        gender,
        lastName,
        messengerLink,
        middleName,
        phoneNumber,
        socialMediaLinks,
        teachingCertifications,
        teachingExperience,
        website,
      } as TeacherUserAccount,
    };
  }

  getAllTeachers(
    teacherIds?: number[],
    q?: string,
    status?: string | UserApprovalStatus.Approved,
  ): Promise<TeacherUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<TeacherUserAccount> = status
        ? {
            user: { approvalStatus: In(status.split(',')) },
          }
        : {
            user: { approvalStatus: UserApprovalStatus.Approved },
          };

      if (teacherIds?.length) {
        return { ...baseWhere, id: In(teacherIds) };
      } else if (!!q?.trim()) {
        return [
          { firstName: ILike(`%${q}%`), ...baseWhere },
          { lastName: ILike(`%${q}%`), ...baseWhere },
          { middleName: ILike(`%${q}%`), ...baseWhere },
        ];
      }

      return baseWhere;
    };

    return this.teacherUserAccountRepo.find({
      where: generateWhere(),
      loadEagerRelations: false,
      relations: { user: true },
      select: {
        user: {
          id: true,
          publicId: true,
          email: true,
          approvalStatus: true,
        },
      },
    });
  }

  getTeacherCountByAdmin(status?: UserApprovalStatus): Promise<number> {
    const where: FindOptionsWhere<TeacherUserAccount> = {
      user: { approvalStatus: status || UserApprovalStatus.Approved },
    };

    return this.teacherUserAccountRepo.count({ where });
  }

  getTeacherByStudentId(
    id: number,
    schoolYearId: number,
  ): Promise<TeacherUserAccount> {
    return this.teacherUserAccountRepo.findOne({
      where: {
        user: {
          approvalStatus: UserApprovalStatus.Approved,
          enrollments: {
            schoolYear: { id: schoolYearId },
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
          },
        },
        enrolledStudents: {
          user: {
            studentUserAccount: { id },
            approvalStatus: UserApprovalStatus.Approved,
            enrollments: {
              schoolYear: { id: schoolYearId },
              approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
            },
          },
        },
      },
      loadEagerRelations: false,
      relations: { user: true },
      select: {
        user: {
          publicId: true,
        },
      },
    });
  }

  getTeacherByPublicId(publicId: string): Promise<TeacherUserAccount> {
    return this.teacherUserAccountRepo.findOne({
      where: {
        user: { publicId, approvalStatus: UserApprovalStatus.Approved },
      },
      loadEagerRelations: false,
      relations: { user: true },
      select: {
        user: {
          publicId: true,
        },
      },
    });
  }

  async updateTeacherUser(
    id: number,
    userDto: TeacherUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    // TODO profile image
    const { profileImageUrl, ...moreUserDto } = userDto;
    // Get existing user and corresponding teacher user account
    const user = await this.userRepo.findOne({
      where: { teacherUserAccount: { id } },
    });
    const teacherUser = await this.teacherUserAccountRepo.findOne({
      where: { id },
    });
    // Return error if either the parent user or teacher user row does not exist
    if (!user || !teacherUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      profileImageUrl,
    });

    const updatedTeacherUser = await this.teacherUserAccountRepo.save({
      ...teacherUser,
      ...moreUserDto,
    });

    // Log update
    this.auditLogService.create(
      {
        actionName: AuditUserAction.updateUser,
        featureId: user.id,
        featureType: AuditFeatureType.user,
      },
      currentUserId,
    );

    return { ...updatedUser, teacherUserAccount: updatedTeacherUser };
  }

  async createTeacherUser(
    userDto: TeacherUserCreateDto,
    approvalStatus: UserApprovalStatus,
    currentUserId?: number,
  ): Promise<User> {
    const { email, password, profileImageUrl, ...moreUserDto } = userDto;
    // Check if email is existing, if true then cancel creation
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!!existingUser) throw new ConflictException('Email is already taken');
    // Encrypt password, use temp password if is registered by admin -- check using currentUserId
    const encryptedPassword = await encryptPassword(
      currentUserId != null ? 't3mp0r4ry_p4ssw0rd' : password,
    );
    // Create and save user base details
    const user = await this.userService.create(
      {
        email,
        password: encryptedPassword,
        profileImageUrl,
        approvalStatus,
      },
      UserRole.Teacher,
      approvalStatus === UserApprovalStatus.Approved,
    );
    // Create and save teacher user account
    const teacherUser = this.teacherUserAccountRepo.create({
      ...moreUserDto,
      user: { id: user.id },
    });
    const newTeacherUser = await this.teacherUserAccountRepo.save(teacherUser);
    // Send email confirmation to user
    await this.userService.sendUserRegisterEmailConfirmation(
      user.email,
      teacherUser.firstName,
      currentUserId != null,
    );

    // Log creation
    if (currentUserId) {
      this.auditLogService.create(
        {
          actionName: AuditUserAction.registerUser,
          featureId: user.id,
          featureType: AuditFeatureType.user,
        },
        currentUserId,
      );
    }

    return { ...user, teacherUserAccount: newTeacherUser };
  }

  async setTeacherApprovalStatus(
    teacherId: number,
    userApprovalDto: UserApprovalDto,
    logUserId: number,
    password?: string,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
    approvalRejectedReason: User['approvalRejectedReason'];
  }> {
    const { approvalStatus, approvalRejectedReason } = userApprovalDto;

    const user = await this.userRepo.findOne({
      where: { teacherUserAccount: { id: teacherId } },
    });

    if (!user) {
      throw new NotFoundException('Teacher not found');
    }

    let publicId = user.publicId;
    if (!publicId && approvalStatus === UserApprovalStatus.Approved) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()), role: UserRole.Teacher },
      });

      publicId = generatePublicId(userCount, user.role);
    }

    const updatedUserData = {
      ...user,
      ...userApprovalDto,
      publicId,
    };

    // If password, then encrypt and save it
    if (password != null) {
      const encryptedPassword = await encryptPassword(password);
      updatedUserData.password = encryptedPassword;
    }

    const updatedUser = await this.userRepo.save(updatedUserData);

    // Send a notification email to user
    approvalStatus === UserApprovalStatus.Approved
      ? this.mailerService.sendUserRegisterApproved(
          user.email,
          publicId,
          user.teacherUserAccount.firstName,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectedReason || '',
          user.email,
          user.teacherUserAccount.firstName,
        );

    // Log approval status
    this.auditLogService.create(
      {
        actionName: AuditUserAction.setApprovalStatus,
        actionValue: approvalStatus,
        featureId: user.id,
        featureType: AuditFeatureType.user,
      },
      logUserId,
    );

    return {
      approvalStatus,
      approvalDate: updatedUser.approvalDate,
      approvalRejectedReason: updatedUser.approvalRejectedReason,
    };
  }

  async deleteTeacherByIdAndAdminId(
    teacherId: number,
    adminId: number,
  ): Promise<boolean> {
    const currentDateTime = dayjs();

    const teacher = await this.teacherUserAccountRepo.findOne({
      where: { id: teacherId },
      relations: {
        user: true,
        lessons: { schedules: true },
        exams: { schedules: true },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const { lessons, exams } = teacher;
    // Abort if teacher has upcoming lesson schedules
    lessons.forEach((lesson) => {
      const isUpcoming = lesson.schedules.some((s) =>
        dayjs(s.startDate).isAfter(currentDateTime),
      );

      if (isUpcoming)
        throw new NotFoundException(
          'Teacher has an upcoming lesson. Cannot delete',
        );
    });
    // Abort if teacher has upcoming exam schedules
    exams.forEach((exam) => {
      const isUpcoming = exam.schedules.some((s) =>
        dayjs(s.startDate).isAfter(currentDateTime),
      );

      if (isUpcoming)
        throw new NotFoundException(
          'Teacher has an upcoming exam. Cannot delete',
        );
    });

    await this.teacherUserAccountRepo.delete({ id: teacher.id });
    const result = await this.userRepo.delete({ id: teacher.user.id });

    // Log student deletion
    this.auditLogService.create(
      {
        actionName: AuditUserAction.deleteUser,
        featureId: teacher.user.id,
        featureType: AuditFeatureType.user,
      },
      adminId,
    );

    return !!result.affected;
  }
}
