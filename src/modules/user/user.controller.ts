import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UseFilterFieldsInterceptor } from '#/common/interceptors/filter-fields.interceptor';
import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseJwtAuthGuard } from '../auth/auth.guard';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { AdminUserAccount } from './entities/admin-user-account.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { UserResponseDto } from './dtos/user-response.dto';
import { UserApprovalDto } from './dtos/user-approval.dto';
import { SuperAdminUserCreateDto } from './dtos/super-admin-user-create.dto';
import { AdminUserCreateDto } from './dtos/admin-user-create.dto';
import { AdminUserUpdateDto } from './dtos/admin-user-update.dto';
import { AdminUserResponseDto } from './dtos/admin-user-response.dto';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { TeacherUserResponseDto } from './dtos/teacher-user-response.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { StudentUserResponseDto } from './dtos/student-user-response.dto';
import { UserService } from './user.service';

const SUPER_ADMIN_URL = '/sad';
const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(UserResponseDto)
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Get('/register/confirm')
  confirmUserRegisterEmail(@Query('token') token: string): Promise<boolean> {
    return this.userService.confirmUserRegisterEmail(token);
  }

  // TEACHERS

  @Get(`${TEACHER_URL}${STUDENT_URL}/list`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentUserResponseDto)
  getStudentsByTeacherId(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: UserApprovalStatus,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[StudentUserAccount[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.userService.getPaginationStudentsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/list/all`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentUserResponseDto)
  getAllStudentsByTeacherId(
    @CurrentUser() user: User,
    @Query('ids') ids: string,
    @Query('q') q: string,
    @Query('status') status?: UserApprovalStatus,
  ) {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedIds = ids?.split(',').map((id) => +id);
    return this.userService.getStudentsByTeacherId(
      teacherId,
      transformedIds,
      q,
      status,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/count`)
  @UseJwtAuthGuard(UserRole.Teacher)
  getStudentCountByTeacherId(
    @CurrentUser() user: User,
    @Query('status') status?: UserApprovalStatus,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.userService.getStudentCountByTeacherId(teacherId, status);
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentUserResponseDto)
  getStudentByPublicIdAndTeacherId(
    @Param('studentId') studentId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.userService.getStudentByIdAndTeacherId(studentId, teacherId);
  }

  @Patch(`${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentTeacherUser(
    @Body() body: TeacherUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id, teacherUserAccount } = user;
    return this.userService.updateTeacherUser(teacherUserAccount.id, body, id);
  }

  @Patch(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateStudentByIdAndTeacherId(
    @Param('studentId') studentId: number,
    @Body() body: StudentUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.userService.updateStudentUser(studentId, body, user.id);
  }

  @Patch(`${TEACHER_URL}${STUDENT_URL}/approve/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  approveStudentByIdAndTeacherId(
    @CurrentUser() user: User,
    @Param('studentId') studentId: number,
    @Body() body: UserApprovalDto,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.userService.setStudentApprovalStatus(studentId, body, user.id);
  }

  @Delete(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  deleteStudentByIdAndTeacherId(
    @Param('studentId') studentId: number,
    @CurrentUser() user: User,
  ) {
    return this.userService.deleteStudentByIdAndTeacherId(studentId, user.id);
  }

  @Post(`${TEACHER_URL}/register`)
  @UseJwtAuthGuard(null, true)
  @UseSerializeInterceptor(UserResponseDto)
  registerTeacher(
    @Body() body: TeacherUserCreateDto,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.userService.createTeacherUser(
      {
        ...body,
        // TEMP
        // approvalStatus: UserApprovalStatus.MailPending,
        approvalStatus: UserApprovalStatus.Approved,
      },
      user?.id,
    );
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/teacher`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(UserResponseDto)
  getAssignedTeacherByStudentId(
    @CurrentUser() user: User,
  ): Promise<Partial<User>> {
    const { id: studentId } = user.studentUserAccount;
    return this.userService.getAssignedTeacherByStudentId(studentId);
  }

  @Post(`${STUDENT_URL}/register`)
  @UseJwtAuthGuard(null, true)
  @UseSerializeInterceptor(UserResponseDto)
  registerStudent(
    @Body() body: StudentUserCreateDto,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.userService.createStudentUser(
      {
        ...body,
        // TEMP
        // approvalStatus: UserApprovalStatus.MailPending,
        approvalStatus: UserApprovalStatus.Pending,
      },
      user?.id,
    );
  }

  @Patch(`${STUDENT_URL}`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentStudentUser(
    @Body() body: StudentUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id, studentUserAccount } = user;
    return this.userService.updateStudentUser(studentUserAccount.id, body, id);
  }

  // ADMINS

  @Patch(`${ADMIN_URL}`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentAdminUser(
    @Body() body: AdminUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id, adminUserAccount } = user;
    return this.userService.updateAdminUser(adminUserAccount.id, body, id);
  }

  @Patch(`${ADMIN_URL}${TEACHER_URL}/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  updateTeacherByIdAndAdminId(
    @Param('teacherId') teacherId: number,
    @Body() body: TeacherUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.userService.updateTeacherUser(teacherId, body, user.id);
  }

  @Delete(`${ADMIN_URL}${TEACHER_URL}/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  deleteTeacherByIdAndAdminId(
    @Param('teacherId') teacherId: number,
    @CurrentUser() user: User,
  ) {
    return this.userService.deleteTeacherByIdAndAdminId(teacherId, user.id);
  }

  @Get(`${ADMIN_URL}${TEACHER_URL}/list`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(TeacherUserResponseDto)
  getTeachers(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('status') status?: UserApprovalStatus,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('own') own?: number,
  ): Promise<[TeacherUserAccount[], number]> {
    const { id: adminId } = user.adminUserAccount;

    return this.userService.getPaginationTeachersByAdminId(
      adminId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
      own === 1,
    );
  }

  @Patch(`${ADMIN_URL}${TEACHER_URL}/approve/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  approveTeacherById(
    @CurrentUser() user: User,
    @Param('teacherId') teacherId: number,
    @Body() body: UserApprovalDto,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.userService.setTeacherApprovalStatus(teacherId, body, user.id);
  }

  @Post(`${ADMIN_URL}/register`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  registerAdmin(@Body() body: AdminUserCreateDto): Promise<User> {
    return this.userService.createAdminUser({
      ...body,
      // TEMP
      // approvalStatus: UserApprovalStatus.MailPending,
      approvalStatus: UserApprovalStatus.Approved,
    });
  }

  // SUPER ADMIN

  @Get(`${SUPER_ADMIN_URL}${ADMIN_URL}/list`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(AdminUserResponseDto)
  getAdminsBySuperAdminId(
    @Query('q') q?: string,
    @Query('status') status?: UserApprovalStatus,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[AdminUserAccount[], number]> {
    return this.userService.getPaginationAdmins(
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Post(`${SUPER_ADMIN_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerSuperAdmin(@Body() body: SuperAdminUserCreateDto): Promise<User> {
    return this.userService.createSuperAdminUser(body);
  }

  @Patch(`${SUPER_ADMIN_URL}${ADMIN_URL}/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  updateAdminByIdAndSuperAdminId(
    @Param('adminId') adminId: number,
    @Body() body: AdminUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.userService.updateAdminUser(adminId, body, user.id);
  }

  @Delete(`${SUPER_ADMIN_URL}${ADMIN_URL}/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  deleteAdminByIdAndSuperAdminId(
    @Param('adminId') adminId: number,
    @CurrentUser() user: User,
  ) {
    return this.userService.deleteAdminByIdAndSuperAdminId(adminId, user.id);
  }
}
