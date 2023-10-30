import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { generatePublicId } from '#/modules/user/helpers/user.helper';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { User } from './entities/user.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { SupabaseService } from './supabase.service';

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

  private async create(user: any, role: UserRole): Promise<User> {
    // Generate public id
    const userCount = await this.userRepo.count();
    const publicId = generatePublicId(userCount, role);
    // Create and save user base details
    const newUser = this.userRepo.create({
      ...user,
      role,
      publicId,
    } as User);
    return this.userRepo.save(newUser);
  }

  getStudentsByIds(
    ids: number[],
    userStatus?: UserApprovalStatus,
  ): Promise<StudentUserAccount[]> {
    const where: FindOptionsWhere<StudentUserAccount> = userStatus
      ? { id: In(ids), user: { approvalStatus: userStatus } }
      : { id: In(ids) };

    return this.studentUserAccountRepo.find({ where });
  }

  getStudentsByTeacherId(
    teacherId: number,
    studentIds?: number[],
    q?: string,
    userStatus?: UserApprovalStatus,
  ): Promise<StudentUserAccount[]> {
    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<StudentUserAccount> = userStatus
        ? {
            teacherUser: { id: teacherId },
            user: { approvalStatus: userStatus },
          }
        : {
            teacherUser: { id: teacherId },
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
      UserRole.Student,
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
    const user = await this.userRepo.findOne({ where: { id } });
    const teacherUser = await this.teacherUserAccountRepo.findOne({
      where: { user: { id } },
    });
    // Return error if either the parent user or teacher user row does not exist
    if (!user || !teacherUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepo.save({
      ...user,
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
    const user = await this.userRepo.findOne({ where: { id } });
    const studentUser = await this.studentUserAccountRepo.findOne({
      where: { user: { id } },
    });
    // Return error if either the parent user or student user row does not exist
    if (!user || !studentUser) {
      throw new NotFoundException('User not found');
    }
    // If teacherId is present, check if teacher exist in db
    // and assign data to be save, else throw error
    const studentUserAccountData: any = {
      ...studentUser,
      ...moreUserDto,
    };
    if (!!teacherId) {
      const assignedTeacherUser = await this.userRepo.findOne({
        where: { publicId: teacherId },
      });

      if (!assignedTeacherUser) {
        throw new NotFoundException("Teacher's ID is Invalid");
      }

      studentUserAccountData.teacherUser = { id: assignedTeacherUser.id };
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      profileImageUrl,
      approvalStatus,
    });
    const updatedStudentUser = await this.studentUserAccountRepo.save(
      studentUserAccountData,
    );
    const teacherUser = {
      ...updatedStudentUser.teacherUser,
      publicId: teacherId,
    };

    return {
      ...updatedUser,
      studentUserAccount: { ...updatedStudentUser, teacherUser },
    };
  }

  async updateApprovalStatus(
    id: number,
    approvalStatus: UserApprovalStatus,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const user = await this.userRepo.findOne({ where: { id } });
    const updatedUser = await this.userRepo.save({
      ...user,
      approvalStatus,
    });

    return { approvalStatus, approvalDate: updatedUser.approvalDate };
  }

  // TODO admin
}
