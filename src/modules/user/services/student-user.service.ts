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

import { encryptPassword } from '#/common/helpers/password.helper';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { generatePublicId } from '#/modules/user/helpers/user.helper';
import {
  AuditFeatureType,
  AuditUserAction,
} from '#/modules/audit-log/enums/audit-log.enum';
import { MailerService } from '#/modules/mailer/mailer.service';
import { AuditLogService } from '#/modules/audit-log/audit-log.service';
import { SchoolYearEnrollmentApprovalStatus } from '#/modules/school-year/enums/school-year-enrollment.enum';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { UserApprovalStatus, UserRole } from '../enums/user.enum';
import { User } from '../entities/user.entity';
import { StudentUserAccount } from '../entities/student-user-account.entity';
import { StudentUserCreateDto } from '../dtos/student-user-create.dto';
import { StudentUserUpdateDto } from '../dtos/student-user-update.dto';
import { UserApprovalDto } from '../dtos/user-approval.dto';
import { UserService } from './user.service';

@Injectable()
export class StudentUserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject(forwardRef(() => SchoolYearService))
    private readonly schoolYearService: SchoolYearService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async getPaginationStudentsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: string,
    schoolYearId?: number,
    enrollmentStatus?: string,
  ): Promise<[StudentUserAccount[], number]> {
    const generateWhere = () => {
      let baseWhere:
        | FindOptionsWhere<StudentUserAccount>
        | FindOptionsWhere<StudentUserAccount>[] = {
        user: {
          enrollments: {
            teacherUser: { id: teacherId },
            ...(schoolYearId && { schoolYear: { id: schoolYearId } }),
            ...(enrollmentStatus && {
              approvalStatus: In(enrollmentStatus.split(',')),
            }),
          },
          ...(status?.trim() && { approvalStatus: In(status.split(',')) }),
        },
      };

      if (q?.trim()) {
        baseWhere = [
          { ...baseWhere, firstName: ILike(`%${q}%`) },
          { ...baseWhere, lastName: ILike(`%${q}%`) },
          { ...baseWhere, middleName: ILike(`%${q}%`) },
        ];
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<StudentUserAccount> => {
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

    const results = await this.studentUserAccountRepo.findAndCount({
      where: generateWhere(),
      relations: { user: { enrollments: true } },
      order: generateOrder(),
      skip,
      take,
    });

    const students = results[0].map((student) => {
      const { publicId, email, approvalStatus, enrollments } = student.user;

      return {
        ...student,
        user: { publicId, email, approvalStatus, enrollments },
      };
    }) as StudentUserAccount[];

    return [students, results[1]];
  }

  // TODO CHECK ALL references for this function
  async getStudentsByTeacherId(
    teacherId?: number,
    studentIds?: number[],
    q?: string,
    status?: string,
    schoolYearId?: number,
    enrollmentStatus?: string,
  ): Promise<StudentUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = {
        user: {
          enrollments: {
            ...(teacherId && { teacherUser: { id: teacherId } }),
            ...(schoolYearId && { schoolYear: { id: schoolYearId } }),
            ...(enrollmentStatus && {
              approvalStatus: In(enrollmentStatus.split(',')),
            }),
          },
          ...(status?.trim() && { approvalStatus: In(status.split(',')) }),
        },
      };

      if (studentIds?.length) {
        return { ...baseWhere, id: In(studentIds) };
      } else if (!!q?.trim()) {
        return [
          { firstName: ILike(`%${q}%`), ...baseWhere },
          { lastName: ILike(`%${q}%`), ...baseWhere },
          { middleName: ILike(`%${q}%`), ...baseWhere },
        ];
      }

      return baseWhere;
    };

    const students = await this.studentUserAccountRepo.find({
      where: generateWhere(),
      loadEagerRelations: false,
      relations: { user: { enrollments: { schoolYear: true } } },
      select: {
        user: {
          publicId: true,
          email: true,
          approvalStatus: true,
          enrollments: {
            id: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            approvalStatus: true,
            approvalDate: true,
            approvalRejectedReason: true,
            academicProgress: true,
            academicProgressRemarks: true,
            schoolYear: { id: true },
          },
        },
      },
    });

    if (!schoolYearId) {
      return students;
    }

    return students.map((student) => {
      const enrollments = student.user.enrollments.filter(
        (enrollment) => enrollment.schoolYear?.id === schoolYearId,
      );

      return { ...student, user: { ...student.user, enrollments } };
    });
  }

  async getStudentCountByTeacherId(
    teacherId: number,
    status?: UserApprovalStatus,
    schoolYearId?: number,
    enrollmentStatus?: SchoolYearEnrollmentApprovalStatus,
  ): Promise<number> {
    const targetSchoolYearId =
      schoolYearId ?? (await this.schoolYearService.getCurrentSchoolYear())?.id;

    const where: FindOptionsWhere<StudentUserAccount> = {
      user: {
        approvalStatus: status ?? UserApprovalStatus.Approved,
        enrollments: {
          teacherUser: { id: teacherId },
          schoolYear: { id: targetSchoolYearId },
          approvalStatus:
            enrollmentStatus ?? SchoolYearEnrollmentApprovalStatus.Approved,
        },
      },
    };

    return this.studentUserAccountRepo.count({ where });
  }

  async getStudentByIdAndTeacherId(
    studentId: number,
    teacherId: number,
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

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
          },
        },
      },
      loadEagerRelations: false,
      relations: {
        user: {
          enrollments: { teacherUser: { user: true } },
        },
      },
      select: {
        user: {
          publicId: true,
          email: true,
          approvalStatus: true,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const teacherPublicId =
      student.user.enrollments[0].teacherUser.user.publicId;

    return {
      ...student,
      teacherUser: {
        publicId: teacherPublicId,
      },
    };
  }

  getStudentsByIds(
    ids: number[],
    schoolYearId?: number,
    status?: UserApprovalStatus,
    enrollmentStatus?: SchoolYearEnrollmentApprovalStatus,
    includeUser?: boolean,
  ): Promise<StudentUserAccount[]> {
    const where: FindOptionsWhere<StudentUserAccount> = {
      id: In(ids),
      user: {
        ...(status && { approvalStatus: status }),
        ...((schoolYearId || enrollmentStatus) && {
          enrollments: {
            ...(schoolYearId && { schoolYear: { id: schoolYearId } }),
            ...(enrollmentStatus && { approvalStatus: enrollmentStatus }),
          },
        }),
      },
    };

    return this.studentUserAccountRepo.find({
      where,
      ...(includeUser && {
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
      }),
    });
  }

  async getStudentByPublicIdAndTeacherId(
    publicId: string,
    teacherId: number,
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

    return this.studentUserAccountRepo.findOne({
      where: {
        user: {
          publicId: publicId.toUpperCase(),
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { id: teacherId },
          },
        },
      },
      loadEagerRelations: false,
      relations: {
        user: true,
        lessonCompletions: true,
        activityCompletions: { activityCategory: true },
        examCompletions: { exam: true },
      },
      select: {
        user: {
          publicId: true,
          email: true,
          approvalStatus: true,
        },
      },
    });
  }

  async createStudentUser(
    userDto: StudentUserCreateDto,
    approvalStatus: UserApprovalStatus,
    currentUserId?: number,
    noEmail?: boolean,
  ): Promise<User> {
    const { email, password, profileImageUrl, ...moreUserDto } = userDto;

    // Check if email is existing, if true then cancel creation
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!!existingUser) throw new ConflictException('Email is already taken');

    // Encrypt password, use temp password if is registered by teacher -- check using currentUserId
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
      UserRole.Student,
      approvalStatus === UserApprovalStatus.Approved,
    );

    // Create and save student user account
    const studentUser = this.studentUserAccountRepo.create({
      ...moreUserDto,
      user: { id: user.id },
    });

    const newStudentUser = await this.studentUserAccountRepo.save(studentUser);

    if (!noEmail) {
      await this.userService.sendUserRegisterEmailConfirmation(
        user.email,
        newStudentUser.firstName,
        currentUserId != null,
      );
    }

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

    return { ...user, studentUserAccount: newStudentUser };
  }

  async updateStudentUser(
    id: number,
    userDto: StudentUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    const { profileImageUrl, ...moreUserDto } = userDto;
    // Get existing user and corresponding student user account
    const user = await this.userRepo.findOne({
      where: { studentUserAccount: { id } },
    });
    const studentUser = await this.studentUserAccountRepo.findOne({
      where: { id },
    });
    // Return error if either the parent user or student user row does not exist
    if (!user || !studentUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      profileImageUrl,
    });

    const updatedStudentUser = await this.studentUserAccountRepo.save({
      ...studentUser,
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

    return {
      ...updatedUser,
      studentUserAccount: updatedStudentUser,
    };
  }

  async setStudentApprovalStatus(
    studentId: number,
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
      where: {
        studentUserAccount: {
          id: studentId,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    let publicId = user.publicId;
    if (!publicId && approvalStatus === UserApprovalStatus.Approved) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()), role: UserRole.Student },
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
          user.studentUserAccount.firstName,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectedReason || '',
          user.email,
          user.studentUserAccount.firstName,
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

  async deleteStudentByIdAndTeacherId(
    studentId: number,
    teacherUserId: number,
    schoolYearId?: number,
  ): Promise<boolean> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        user: {
          enrollments: {
            schoolYear: { id: schoolYear.id },
            teacherUser: { user: { id: teacherUserId } },
          },
        },
      },
      relations: {
        user: true,
        examCompletions: true,
        lessonCompletions: true,
        activityCompletions: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Abort if student has completions
    const { examCompletions, lessonCompletions, activityCompletions } = student;
    if (
      examCompletions.length ||
      lessonCompletions.length ||
      activityCompletions.length
    ) {
      throw new BadRequestException('Cannot delete Student');
    }

    await this.studentUserAccountRepo.delete({ id: student.id });
    const result = await this.userRepo.delete({ id: student.user.id });

    // Log student deletion
    this.auditLogService.create(
      {
        actionName: AuditUserAction.deleteUser,
        featureId: student.user.id,
        featureType: AuditFeatureType.user,
      },
      teacherUserId,
    );

    return !!result.affected;
  }
}
