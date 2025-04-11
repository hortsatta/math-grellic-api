import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { encryptPassword } from '#/common/helpers/password.helper';
import { generatePublicId } from '#/modules/user/helpers/user.helper';
import { MailerService } from '../../mailer/mailer.service';
import { UserApprovalStatus, UserRole } from '../enums/user.enum';
import { User } from '../entities/user.entity';
import { UserLastStepRegisterDto } from '../dtos/user-last-step-register.dto';
import { SuperAdminUserCreateDto } from '../dtos/super-admin-user-create.dto';
import { UserApprovalDto } from '../dtos/user-approval.dto';
import { AdminUserService } from './admin-user.service';
import { TeacherUserService } from './teacher-user.service';
import { StudentUserService } from './student-user.service';

@Injectable()
export class UserService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => AdminUserService))
    private readonly adminUserService: AdminUserService,
    @Inject(forwardRef(() => TeacherUserService))
    private readonly teacherUserService: TeacherUserService,
    @Inject(forwardRef(() => StudentUserService))
    private readonly studentUserService: StudentUserService,
  ) {}

  async sendUserRegisterEmailConfirmation(
    email: string,
    firstName?: string,
    isRegisteredBySuperior?: boolean,
  ): Promise<void> {
    try {
      // Send email confirmation to user
      await this.mailerService.sendUserRegisterConfirmation(
        email,
        firstName,
        isRegisteredBySuperior,
      );
    } catch (error) {
      // If Request time like error, then send again
      await this.mailerService.sendUserRegisterConfirmation(
        email,
        firstName,
        isRegisteredBySuperior,
      );
    }
  }

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

    if (
      !user ||
      payload.isFinal ||
      user.approvalStatus === UserApprovalStatus.Rejected
    ) {
      throw new BadRequestException('Cannot confirm email');
    }

    if (user.approvalStatus !== UserApprovalStatus.MailPending) {
      throw new BadRequestException('Email already confirmed');
    }

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
          approvalStatusResult =
            await this.adminUserService.setAdminApprovalStatus(
              user.adminUserAccount?.id,
              userApprovalDto,
              user.id,
              password,
            );
          break;
        }
        case UserRole.Teacher: {
          approvalStatusResult =
            await this.teacherUserService.setTeacherApprovalStatus(
              user.teacherUserAccount?.id,
              userApprovalDto,
              user.id,
              password,
            );
          break;
        }
        case UserRole.Student: {
          approvalStatusResult =
            await this.studentUserService.setStudentApprovalStatus(
              user.studentUserAccount?.id,
              userApprovalDto,
              user.studentUserAccount?.teacherUser?.user?.id,
              user.id,
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

  async create(
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

  getOneByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
    });
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
}
