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
import { MailerService } from '../mailer/mailer.service';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { User } from './entities/user.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { UserApprovalDto } from './dtos/user-approval.dto';

@Injectable()
export class UserService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherUserAccount)
    private readonly teacherUserAccountRepo: Repository<TeacherUserAccount>,
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
  ) {}

  async confirmUserRegisterEmail(token: string): Promise<boolean> {
    const payload = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const user = await this.findOneByEmail(payload.email);

    // TEMP
    // if (!user || user.approvalStatus === UserApprovalStatus.Rejected) {
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

  private async create(
    user: any,
    role: UserRole,
    withPublicId: boolean,
  ): Promise<User> {
    // Generate public id
    let publicId = null;
    if (withPublicId) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()) },
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

  findOneByEmail(email: string): Promise<User> {
    return this.userRepo.findOne({ where: { email } });
  }

  updateLastLoginDate(user: User) {
    return this.userRepo.save({
      ...user,
      lastLoginAt: dayjs().toDate(),
    });
  }

  async getPaginationStudentsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: UserApprovalStatus,
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

  getStudentsByTeacherId(
    teacherId: number,
    studentIds?: number[],
    q?: string,
    status?: UserApprovalStatus,
  ): Promise<StudentUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = status
        ? {
            teacherUser: { id: teacherId },
            user: { approvalStatus: status },
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

  async createTeacherUser(userDto: TeacherUserCreateDto): Promise<User> {
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
        approvalStatus: UserApprovalStatus.Approved,
      },
      UserRole.Teacher,
      true,
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

    return { ...user, teacherUserAccount: newTeacherUser };
  }

  async createStudentUser(userDto: StudentUserCreateDto): Promise<User> {
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

    return { ...user, studentUserAccount: { ...newStudentUser, teacherUser } };
  }

  async updateTeacherUser(
    id: number,
    userDto: TeacherUserUpdateDto,
  ): Promise<User> {
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

    return { ...updatedUser, teacherUserAccount: updatedTeacherUser };
  }

  async updateStudentUser(
    id: number,
    userDto: StudentUserUpdateDto,
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

    return {
      ...updatedUser,
      studentUserAccount: { ...updatedStudentUser, teacherUser },
    };
  }

  async deleteStudentByIdAndTeacherId(
    studentId: number,
    teacherId: number,
  ): Promise<boolean> {
    const student = await this.studentUserAccountRepo.findOne({
      where: { id: studentId, teacherUser: { id: teacherId } },
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
    return !!result.affected;
  }

  async setStudentApprovalStatus(
    studentId: number,
    userApprovalDto: UserApprovalDto,
    teacherId: number,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const { approvalStatus, approvalRejectReason } = userApprovalDto;

    const user = await this.userRepo.findOne({
      where: {
        studentUserAccount: { id: studentId, teacherUser: { id: teacherId } },
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

    const updatedUser = await this.userRepo.save({
      ...user,
      ...userApprovalDto,
      publicId,
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

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
  }

  // TODO admin

  async setTeacherApprovalStatus(
    teacherId: number,
    userApprovalDto: UserApprovalDto,
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

    const updatedUser = await this.userRepo.save({
      ...user,
      ...userApprovalDto,
      publicId,
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

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
  }
}
