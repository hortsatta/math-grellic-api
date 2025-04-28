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
} from '../../audit-log/enums/audit-log.enum';
import { MailerService } from '../../mailer/mailer.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
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
  ): Promise<[StudentUserAccount[], number]> {
    const generateWhere = () => {
      let baseWhere:
        | FindOptionsWhere<StudentUserAccount>
        | FindOptionsWhere<StudentUserAccount>[] = {
        teacherUser: { id: teacherId },
      };

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
      relations: { user: true },
      order: generateOrder(),
      skip,
      take,
    });

    const students = results[0].map((student) => {
      const { publicId, email, approvalStatus } = student.user;

      return {
        ...student,
        user: { publicId, email, approvalStatus },
      };
    }) as StudentUserAccount[];

    return [students, results[1]];
  }

  getStudentsByTeacherId(
    teacherId: number,
    studentIds?: number[],
    q?: string,
    status?: string | UserApprovalStatus.Approved,
  ): Promise<StudentUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = status
        ? {
            teacherUser: { id: teacherId },
            user: { approvalStatus: In(status.split(',')) },
          }
        : {
            teacherUser: { id: teacherId },
            user: { approvalStatus: UserApprovalStatus.Approved },
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

    return this.studentUserAccountRepo.find({
      where: generateWhere(),
      loadEagerRelations: false,
      relations: { user: true },
      select: {
        user: {
          publicId: true,
          email: true,
          approvalStatus: true,
        },
      },
    });
  }

  getStudentCountByTeacherId(
    teacherId: number,
    status?: UserApprovalStatus,
  ): Promise<number> {
    const where: FindOptionsWhere<StudentUserAccount> = status
      ? { teacherUser: { id: teacherId }, user: { approvalStatus: status } }
      : {
          teacherUser: { id: teacherId },
          user: { approvalStatus: UserApprovalStatus.Approved },
        };

    return this.studentUserAccountRepo.count({ where });
  }

  async getStudentByIdAndTeacherId(studentId: number, teacherId: number) {
    const student = await this.studentUserAccountRepo.findOne({
      where: {
        id: studentId,
        teacherUser: { id: teacherId },
      },
      loadEagerRelations: false,
      relations: {
        user: true,
        teacherUser: {
          user: true,
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

    const { teacherUser, ...moreStudent } = student;

    return {
      ...moreStudent,
      teacherUser: { publicId: teacherUser.user.publicId },
    };
  }

  getStudentsByIds(
    ids: number[],
    status?: UserApprovalStatus,
    includeUser?: boolean,
  ): Promise<StudentUserAccount[]> {
    const where: FindOptionsWhere<StudentUserAccount> = status
      ? { id: In(ids), user: { approvalStatus: status } }
      : { id: In(ids) };

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

  getStudentByPublicIdAndTeacherId(publicId: string, teacherId: number) {
    return this.studentUserAccountRepo.findOne({
      where: {
        teacherUser: { id: teacherId },
        user: {
          publicId: publicId.toUpperCase(),
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
  ): Promise<User> {
    const { teacherId, email, password, profileImageUrl, ...moreUserDto } =
      userDto;

    const assignedTeacherUser = await this.userRepo.findOne({
      where: { publicId: teacherId },
    });

    const isUserExisting = !!(await this.userRepo.findOne({
      where: { email },
    }));

    // Check if teacher or email is valid, else throw error
    if (!assignedTeacherUser) {
      throw new NotFoundException("Teacher's ID is Invalid");
    } else if (isUserExisting) {
      throw new ConflictException('Email is already taken');
    }

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
      teacherUser: { id: assignedTeacherUser.teacherUserAccount.id },
    });

    const newStudentUser = await this.studentUserAccountRepo.save(studentUser);
    const teacherUser = { ...newStudentUser.teacherUser, publicId: teacherId };

    await this.userService.sendUserRegisterEmailConfirmation(
      user.email,
      newStudentUser.firstName,
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

    return { ...user, studentUserAccount: { ...newStudentUser, teacherUser } };
  }

  async updateStudentUser(
    id: number,
    userDto: StudentUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    const { teacherId, profileImageUrl, ...moreUserDto } = userDto;
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

    const teacherUser = {
      ...updatedStudentUser.teacherUser,
      publicId: teacherId,
    };

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
      studentUserAccount: { ...updatedStudentUser, teacherUser },
    };
  }

  async setStudentApprovalStatus(
    studentId: number,
    userApprovalDto: UserApprovalDto,
    teacherId: number,
    logUserId: number,
    password?: string,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const { approvalStatus, approvalRejectReason } = userApprovalDto;

    const user = await this.userRepo.findOne({
      where: {
        studentUserAccount: {
          id: studentId,
          teacherUser: { user: { id: teacherId } },
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
          user.studentUserAccount.firstName,
          publicId,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectReason || '',
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

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
  }

  async deleteStudentByIdAndTeacherId(
    studentId: number,
    teacherId: number,
  ): Promise<boolean> {
    const student = await this.studentUserAccountRepo.findOne({
      where: { id: studentId, teacherUser: { user: { id: teacherId } } },
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
      teacherId,
    );

    return !!result.affected;
  }
}
