import {
  BadRequestException,
  ConflictException,
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

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { generatePublicId } from '#/modules/user/helpers/user.helper';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { User } from './entities/user.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { SupabaseService } from '../core/supabase.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherUserAccount)
    private readonly teacherUserAccountRepo: Repository<TeacherUserAccount>,
    @InjectRepository(StudentUserAccount)
    private readonly studentUserAccountRepo: Repository<StudentUserAccount>,
    private readonly supabaseService: SupabaseService,
  ) {}

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
        students: { id, user: { approvalStatus: UserApprovalStatus.Approved } },
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
    const { email, password, profileImageUrl, approvalStatus, ...moreUserDto } =
      userDto;

    // Sign up to supabase auth
    const { data: supabaseData, error: supabaseError } =
      await this.supabaseService.register(email, password);
    // Throw error if email is already used
    if (!!supabaseError) {
      throw new ConflictException('Email is already taken');
    }

    // Create and save user base details
    const user = await this.create(
      {
        supabaseUserId: supabaseData.user.id,
        email,
        profileImageUrl,
        approvalStatus,
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

    // Sign up to supabase auth
    const { data: supabaseData, error: supabaseError } =
      await this.supabaseService.register(
        email,
        password == null ? 'qweasdzxc' : password,
      );
    // Throw error if email is already used
    if (!!supabaseError) {
      throw new ConflictException('Email is already taken');
    }

    // Create and save user base details
    const user = await this.create(
      {
        supabaseUserId: supabaseData.user.id,
        email,
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
    approvalStatus: UserApprovalStatus,
    teacherId?: number,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const where: FindOptionsWhere<User> = teacherId
      ? {
          studentUserAccount: { id: studentId, teacherUser: { id: teacherId } },
        }
      : { studentUserAccount: { id: studentId } };

    const user = await this.userRepo.findOne({ where });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    let publicId = user.publicId;
    if (!publicId && approvalStatus === UserApprovalStatus.Approved) {
      const userCount = await this.userRepo.count({
        where: { publicId: Not(IsNull()) },
      });

      publicId = generatePublicId(userCount, user.role);
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      publicId,
      approvalStatus,
    });

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
  }

  // TODO admin
}
