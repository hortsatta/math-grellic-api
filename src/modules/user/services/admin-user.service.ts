import {
  ConflictException,
  forwardRef,
  Inject,
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
import { UserApprovalStatus, UserRole } from '../enums/user.enum';
import { User } from '../entities/user.entity';
import { AdminUserAccount } from '../entities/admin-user-account.entity';
import { AdminUserCreateDto } from '../dtos/admin-user-create.dto';
import { AdminUserUpdateDto } from '../dtos/admin-user-update.dto';
import { UserApprovalDto } from '../dtos/user-approval.dto';
import { UserService } from './user.service';

export class AdminUserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AdminUserAccount)
    private readonly adminUserAccountRepo: Repository<AdminUserAccount>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

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

  getAdminCountBySuperAdmin(status?: UserApprovalStatus): Promise<number> {
    const where: FindOptionsWhere<AdminUserAccount> = {
      user: { approvalStatus: status || UserApprovalStatus.Approved },
    };

    return this.adminUserAccountRepo.count({ where });
  }

  async getAdminById(adminId: number) {
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

  async createAdminUser(
    userDto: AdminUserCreateDto,
    approvalStatus: UserApprovalStatus,
  ): Promise<User> {
    const { email, profileImageUrl, ...moreUserDto } = userDto;
    // Check if email is existing, if true then cancel creation
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!!existingUser) throw new ConflictException('Email is already taken');
    // Encrypt password; create and save user details
    const encryptedPassword = await encryptPassword('t3mp0r4ry_p4ssw0rd');
    // Create and save user base details
    const user = await this.userService.create(
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
    await this.userService.sendUserRegisterEmailConfirmation(
      user.email,
      adminUser.firstName,
      true,
    );

    // Dont audit log since app only has one super admin

    return { ...user, adminUserAccount: newAdminUser };
  }

  async updateAdminUser(
    id: number,
    userDto: AdminUserUpdateDto,
    currentUserId: number,
  ): Promise<User> {
    // TODO profile image
    const { profileImageUrl, ...moreUserDto } = userDto;
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

    const updatedUser = await this.userRepo.save({
      ...user,
      profileImageUrl,
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

  async setAdminApprovalStatus(
    adminId: number,
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
          user.adminUserAccount.firstName,
        )
      : this.mailerService.sendUserRegisterRejected(
          approvalRejectedReason || '',
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

    return {
      approvalStatus,
      approvalDate: updatedUser.approvalDate,
      approvalRejectedReason: updatedUser.approvalRejectedReason,
    };
  }
}
