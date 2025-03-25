import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
} from '../audit-log/enums/audit-log.enum';
import { MailerService } from '../mailer/mailer.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { User } from './entities/user.entity';
import { AdminUserAccount } from './entities/admin-user-account.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { UserLastStepRegisterDto } from './dtos/user-last-step-register.dto';
import { SuperAdminUserCreateDto } from './dtos/super-admin-user-create.dto';
import { AdminUserCreateDto } from './dtos/admin-user-create.dto';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { AdminUserUpdateDto } from './dtos/admin-user-update.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { UserApprovalDto } from './dtos/user-approval.dto';

@Injectable()
export class UserService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AdminUserAccount)
    private readonly adminUserAccountRepo: Repository<AdminUserAccount>,
    @InjectRepository(TeacherUserAccount)
    private readonly teacherUserAccountRepo: Repository<TeacherUserAccount>,
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUserRegistrationToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      // Check if user is exist
      const user = await this.findOneByEmail(payload.email);
      if (!user) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  async confirmUserRegistrationEmail(token: string): Promise<boolean> {
    const payload = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const user = await this.findOneByEmail(payload.email);

    // TEMP
    // if (!user || payload.isFinal || user.approvalStatus === UserApprovalStatus.Rejected) {
    //   throw new BadRequestException('Cannot confirm email');
    // }

    // if (user.approvalStatus !== UserApprovalStatus.MailPending) {
    //   throw new BadRequestException('Email already confirmed');
    // }

    await this.userRepo.save({
      ...user,
      approvalStatus: UserApprovalStatus.Pending,
    });

    return true;
  }

  async confirmUserRegistrationLastStep(
    userLastStepDto: UserLastStepRegisterDto,
  ): Promise<{ publicId: string }> {
    const { token, password } = userLastStepDto;

    const payload = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const user = await this.findOneByEmail(payload.email, true);

    if (
      !user ||
      !payload.isFinal ||
      user.approvalStatus === UserApprovalStatus.Rejected
    ) {
      throw new BadRequestException('Cannot confirm email');
    }

    if (user.approvalStatus !== UserApprovalStatus.MailPending) {
      throw new BadRequestException('Email already confirmed');
    }

    try {
      let approvalStatusResult = null;
      const userApprovalDto = {
        approvalStatus: UserApprovalStatus.Approved,
      } as UserApprovalDto;

      switch (user.role) {
        case UserRole.Admin: {
          approvalStatusResult = await this.setAdminApprovalStatus(
            user.adminUserAccount?.id,
            userApprovalDto,
            user.id,
            password,
          );
          break;
        }
        case UserRole.Teacher: {
          approvalStatusResult = await this.setTeacherApprovalStatus(
            user.teacherUserAccount?.id,
            userApprovalDto,
            user.id,
            password,
          );
          break;
        }
        case UserRole.Student: {
          approvalStatusResult = await this.setStudentApprovalStatus(
            user.studentUserAccount?.id,
            userApprovalDto,
            user.id,
            user.studentUserAccount?.teacherUser?.user?.id,
            password,
          );
          break;
        }
      }

      if (
        approvalStatusResult?.approvalStatus !== UserApprovalStatus.Approved
      ) {
        throw new BadRequestException('Cannot approve user');
      }

      const updatedUser = await this.findOneByEmail(payload.email);
      return { publicId: updatedUser.publicId };
    } catch (error) {
      throw new BadRequestException('Cannot proceed. An error occured');
    }
  }

  private async create(
    user: any,
    role: UserRole,
    withPublicId: boolean,
  ): Promise<User> {
    // Generate public id
    let publicId = null;
    if (withPublicId) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()), role },
      });

      publicId = generatePublicId(userCount, role);
    }
    // Create and save user base details
    const newUser = this.userRepo.create({
      ...user,
      role,
      publicId,
    } as User);

    return this.userRepo.save(newUser);
  }

  findOneByEmail(email: string, withUserAccount?: boolean): Promise<User> {
    const generateOptions = () => {
      const where = { email };
      const relations = withUserAccount
        ? {
            adminUserAccount: true,
            teacherUserAccount: true,
            studentUserAccount: { teacherUser: { user: true } },
          }
        : undefined;

      return { where, relations };
    };

    return this.userRepo.findOne(generateOptions());
  }

  updateLastLoginDate(user: User) {
    return this.userRepo.save({
      ...user,
      lastLoginAt: dayjs().toDate(),
    });
  }

  async getPaginationAdmins(
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: UserApprovalStatus,
  ): Promise<[AdminUserAccount[], number]> {
    const generateWhere = () => {
      let baseWhere:
        | FindOptionsWhere<AdminUserAccount>
        | FindOptionsWhere<AdminUserAccount>[] = {};

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

    const generateOrder = (): FindOptionsOrder<AdminUserAccount> => {
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

    const results = await this.adminUserAccountRepo.findAndCount({
      where: generateWhere(),
      relations: { user: true },
      order: generateOrder(),
      skip,
      take,
    });

    const admins = results[0].map((admin) => {
      const { publicId, email, approvalStatus } = admin.user;

      return {
        ...admin,
        user: { publicId, email, approvalStatus },
      };
    }) as AdminUserAccount[];

    return [admins, results[1]];
  }

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

  getStudentsByIds(
    ids: number[],
    status?: UserApprovalStatus,
  ): Promise<StudentUserAccount[]> {
    const where: FindOptionsWhere<StudentUserAccount> = status
      ? { id: In(ids), user: { approvalStatus: status } }
      : { id: In(ids) };

    return this.studentUserAccountRepo.find({ where });
  }

  getAdminsBySuperAdmin(
    adminIds?: number[],
    q?: string,
    status?: string | UserApprovalStatus,
  ): Promise<AdminUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<AdminUserAccount> = status
        ? {
            user: { approvalStatus: In(status.split(',')) },
          }
        : { user: { approvalStatus: UserApprovalStatus.Approved } };

      if (adminIds?.length) {
        return { ...baseWhere, id: In(adminIds) };
      } else if (!!q?.trim()) {
        return [
          { firstName: ILike(`%${q}%`), ...baseWhere },
          { lastName: ILike(`%${q}%`), ...baseWhere },
          { middleName: ILike(`%${q}%`), ...baseWhere },
        ];
      }

      return baseWhere;
    };

    return this.adminUserAccountRepo.find({
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

  async getAdminByIdAndSuperAdmin(adminId: number) {
    const admin = await this.adminUserAccountRepo.findOne({
      where: {
        id: adminId,
      },
      loadEagerRelations: false,
      relations: {
        user: true,
      },
      select: {
        user: {
          publicId: true,
          email: true,
          approvalStatus: true,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
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

  getTeacherByStudentId(id: number): Promise<TeacherUserAccount> {
    return this.teacherUserAccountRepo.findOne({
      where: {
        students: {
          id,
          user: { approvalStatus: UserApprovalStatus.Approved },
        },
        user: { approvalStatus: UserApprovalStatus.Approved },
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

  async getAssignedTeacherByStudentId(id: number): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: {
        approvalStatus: UserApprovalStatus.Approved,
        teacherUserAccount: {
          students: {
            id,
            user: { approvalStatus: UserApprovalStatus.Approved },
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

  getOneByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
    });
  }

  getAdminCountBySuperAdmin(status?: UserApprovalStatus): Promise<number> {
    const where: FindOptionsWhere<AdminUserAccount> = {
      user: { approvalStatus: status || UserApprovalStatus.Approved },
    };

    return this.adminUserAccountRepo.count({ where });
  }

  getTeacherCountByAdmin(status?: UserApprovalStatus): Promise<number> {
    const where: FindOptionsWhere<TeacherUserAccount> = {
      user: { approvalStatus: status || UserApprovalStatus.Approved },
    };

    return this.teacherUserAccountRepo.count({ where });
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

  async createSuperAdminUser(userDto: SuperAdminUserCreateDto): Promise<User> {
    // Abort if app has already a super admin user (only 1 is permitted)
    const existingUser = await this.userRepo.findOne({
      where: { role: UserRole.SuperAdmin },
    });

    if (!!existingUser)
      throw new ConflictException('Super admin already registered');

    const { password, ...moreUserDto } = userDto;
    // Encrypt password; create and save user details
    const encryptedPassword = await encryptPassword(password);

    return this.create(
      {
        ...moreUserDto,
        password: encryptedPassword,
        approvalStatus: UserApprovalStatus.Approved,
      },
      UserRole.SuperAdmin,
      true,
    );
  }

  async createAdminUser(userDto: AdminUserCreateDto): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, profileImageUrl, approvalStatus, ...moreUserDto } = userDto;
    // Check if email is existing, if true then cancel creation
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!!existingUser) throw new ConflictException('Email is already taken');
    // Encrypt password; create and save user details
    const encryptedPassword = await encryptPassword('t3mp0r4ry_p4ssw0rd');
    // Create and save user base details
    const user = await this.create(
      {
        email,
        profileImageUrl,
        approvalStatus,
        password: encryptedPassword,
      },
      UserRole.Admin,
      approvalStatus === UserApprovalStatus.Approved,
    );
    // Create and save admin user account
    const adminUser = this.adminUserAccountRepo.create({
      ...moreUserDto,
      user: { id: user.id },
    });
    const newAdminUser = await this.adminUserAccountRepo.save(adminUser);
    // Send email confirmation to user
    await this.mailerService.sendUserRegisterConfirmation(
      user.email,
      adminUser.firstName,
      true,
    );

    // Dont audit log since app only has one super admin

    return { ...user, adminUserAccount: newAdminUser };
  }

  async createTeacherUser(
    userDto: TeacherUserCreateDto,
    currentUserId?: number,
  ): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, password, profileImageUrl, approvalStatus, ...moreUserDto } =
      userDto;
    // Check if email is existing, if true then cancel creation
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!!existingUser) throw new ConflictException('Email is already taken');
    // Encrypt password; create and save user details
    const encryptedPassword = await encryptPassword(password);
    // Create and save user base details
    const user = await this.create(
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
    await this.mailerService.sendUserRegisterConfirmation(
      user.email,
      teacherUser.firstName,
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

  async createStudentUser(
    userDto: StudentUserCreateDto,
    currentUserId?: number,
  ): Promise<User> {
    const {
      teacherId,
      email,
      password,
      profileImageUrl,
      approvalStatus,
      ...moreUserDto
    } = userDto;

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
    // Encrypt password; create and save user details
    const encryptedPassword = await encryptPassword(password);
    // Create and save user base details
    const user = await this.create(
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
    // Send email confirmation to user
    await this.mailerService.sendUserRegisterConfirmation(
      user.email,
      newStudentUser.firstName,
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

  async updateAdminUser(
    id: number,
    userDto: AdminUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    // TODO profile image
    const { profileImageUrl, approvalStatus, ...moreUserDto } = userDto;
    // Get existing user and corresponding admin user account
    const user = await this.userRepo.findOne({
      where: { adminUserAccount: { id } },
    });
    const adminUser = await this.adminUserAccountRepo.findOne({
      where: { id },
    });
    // Return error if either the parent user or user user row does not exist
    if (!user || !adminUser) {
      throw new NotFoundException('User not found');
    }

    let publicId = user.publicId;
    if (approvalStatus !== user.approvalStatus) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()) },
      });

      publicId = generatePublicId(userCount, user.role);
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      publicId,
      profileImageUrl,
      approvalStatus,
    });

    const updatedAdminUser = await this.adminUserAccountRepo.save({
      ...adminUser,
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

    return { ...updatedUser, adminUserAccount: updatedAdminUser };
  }

  async updateTeacherUser(
    id: number,
    userDto: TeacherUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    // TODO profile image
    const { profileImageUrl, approvalStatus, ...moreUserDto } = userDto;
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

    let publicId = user.publicId;
    if (approvalStatus !== user.approvalStatus) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()) },
      });

      publicId = generatePublicId(userCount, user.role);
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      publicId,
      profileImageUrl,
      approvalStatus,
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

  async updateStudentUser(
    id: number,
    userDto: StudentUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    const { teacherId, profileImageUrl, approvalStatus, ...moreUserDto } =
      userDto;
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

    let publicId = user.publicId;
    if (!publicId && approvalStatus !== user.approvalStatus) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()) },
      });

      publicId = generatePublicId(userCount, user.role);
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      publicId,
      profileImageUrl,
      approvalStatus,
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

  async deleteAdminByIdAndSuperAdminId(
    adminId: number,
    superAdminId: number,
  ): Promise<boolean> {
    const admin = await this.adminUserAccountRepo.findOne({
      where: { id: adminId },
      relations: {
        user: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    await this.adminUserAccountRepo.delete({ id: admin.id });
    const result = await this.userRepo.delete({ id: admin.user.id });

    // Log student deletion
    this.auditLogService.create(
      {
        actionName: AuditUserAction.deleteUser,
        featureId: admin.user.id,
        featureType: AuditFeatureType.user,
      },
      superAdminId,
    );

    return !!result.affected;
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

  async setAdminApprovalStatus(
    adminId: number,
    userApprovalDto: UserApprovalDto,
    logUserId: number,
    password?: string,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const { approvalStatus, approvalRejectReason } = userApprovalDto;

    const user = await this.userRepo.findOne({
      where: { adminUserAccount: { id: adminId } },
    });

    if (!user) {
      throw new NotFoundException('Admin not found');
    }

    let publicId = user.publicId;
    if (!publicId && approvalStatus === UserApprovalStatus.Approved) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()), role: UserRole.Admin },
      });

      publicId = generatePublicId(userCount, user.role);
    }
    // If password, then encrypt and save it
    const encryptedPassword = await encryptPassword(password);

    const updatedUser = await this.userRepo.save({
      ...user,
      ...userApprovalDto,
      publicId,
      password: encryptedPassword,
    });

    // Send a notification email to user
    approvalStatus === UserApprovalStatus.Approved
      ? this.mailerService.sendUserRegisterApproved(
          user.email,
          user.adminUserAccount.firstName,
          publicId,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectReason || '',
          user.email,
          user.adminUserAccount.firstName,
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

  async setTeacherApprovalStatus(
    teacherId: number,
    userApprovalDto: UserApprovalDto,
    logUserId: number,
    password?: string,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const { approvalStatus, approvalRejectReason } = userApprovalDto;

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
    // If password, then encrypt and save it
    const encryptedPassword = await encryptPassword(password);

    const updatedUser = await this.userRepo.save({
      ...user,
      ...userApprovalDto,
      publicId,
      password: encryptedPassword,
    });

    // Send a notification email to user
    approvalStatus === UserApprovalStatus.Approved
      ? this.mailerService.sendUserRegisterApproved(
          user.email,
          user.teacherUserAccount.firstName,
          publicId,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectReason || '',
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

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
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
    // If password, then encrypt and save it
    const encryptedPassword = await encryptPassword(password);

    const updatedUser = await this.userRepo.save({
      ...user,
      ...userApprovalDto,
      publicId,
      password: encryptedPassword,
    });

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
}
