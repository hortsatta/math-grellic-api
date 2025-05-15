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
import { SchoolYearEnrollmentApprovalStatus } from '../school-year/enums/school-year-enrollment.enum';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { AdminUserAccount } from './entities/admin-user-account.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { UserLastStepRegisterDto } from './dtos/user-last-step-register.dto';
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
import { UserService } from './services/user.service';
import { AdminUserService } from './services/admin-user.service';
import { TeacherUserService } from './services/teacher-user.service';
import { StudentUserService } from './services/student-user.service';

const SUPER_ADMIN_URL = '/sad';
const ADMIN_URL = '/admins';
const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly adminUserService: AdminUserService,
    private readonly teacherUserService: TeacherUserService,
    private readonly studentUserService: StudentUserService,
  ) {}

  @Get('/me')
  @UseJwtAuthGuard()
  @UseSerializeInterceptor(UserResponseDto)
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Get('/register/confirm/validate')
  validateUserRegistrationToken(
    @Query('token') token: string,
  ): Promise<boolean> {
    return this.userService.validateUserRegistrationToken(token);
  }

  @Get('/register/confirm')
  confirmUserRegistrationEmail(
    @Query('token') token: string,
  ): Promise<{ publicId: string }> {
    return this.userService.confirmUserRegistrationEmail(token);
  }

  @Post('/register/confirm/last-step')
  confirmUserRegistrationLastStep(
    @Body() body: UserLastStepRegisterDto,
  ): Promise<{ publicId: string }> {
    return this.userService.confirmUserRegistrationLastStep(body);
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
    @Query('sy') schoolYearId?: number,
    @Query('estatus') enrollmentStatus?: string,
  ): Promise<[StudentUserAccount[], number]> {
    const { id: teacherId } = user.teacherUserAccount;

    return this.studentUserService.getPaginationStudentsByTeacherId(
      teacherId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
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
    @Query('status') status?: string,
    @Query('sy') schoolYearId?: number,
    @Query('estatus')
    enrollmentStatus?: string,
  ) {
    const { id: teacherId } = user.teacherUserAccount;

    const transformedIds = ids?.split(',').map((id) => +id);
    return this.studentUserService.getStudentsByTeacherId(
      teacherId,
      transformedIds,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/count`)
  @UseJwtAuthGuard(UserRole.Teacher)
  getStudentCountByTeacherId(
    @CurrentUser() user: User,
    @Query('status') status?: UserApprovalStatus,
    @Query('sy') schoolYearId?: number,
    @Query('estatus') enrollmentStatus?: SchoolYearEnrollmentApprovalStatus,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.studentUserService.getStudentCountByTeacherId(
      teacherId,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
    );
  }

  @Get(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentUserResponseDto)
  getStudentByIdAndTeacherId(
    @CurrentUser() user: User,
    @Param('studentId') studentId: number,
    @Query('sy') schoolYearId?: number,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.studentUserService.getStudentByIdAndTeacherId(
      studentId,
      teacherId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Patch(`${TEACHER_URL}`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentTeacherUser(
    @Body() body: TeacherUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id, teacherUserAccount } = user;
    return this.teacherUserService.updateTeacherUser(
      teacherUserAccount.id,
      body,
      id,
    );
  }

  @Patch(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateStudentByIdAndTeacherId(
    @Param('studentId') studentId: number,
    @Body() body: StudentUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.studentUserService.updateStudentUser(studentId, body, user.id);
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
    return this.studentUserService.setStudentApprovalStatus(
      studentId,
      body,
      user.id,
    );
  }

  @Delete(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseJwtAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  deleteStudentByIdAndTeacherId(
    @CurrentUser() user: User,
    @Param('studentId') studentId: number,
    @Query('sy') schoolYearId?: number,
  ) {
    return this.studentUserService.deleteStudentByIdAndTeacherId(
      studentId,
      user.id,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post(`${TEACHER_URL}/register`)
  @UseJwtAuthGuard(null, true)
  @UseSerializeInterceptor(UserResponseDto)
  registerTeacher(
    @Body() body: TeacherUserCreateDto,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.teacherUserService.createTeacherUser(
      body,
      UserApprovalStatus.Pending,
      user?.id,
    );
  }

  // STUDENTS

  @Get(`${STUDENT_URL}/teacher`)
  @UseJwtAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(UserResponseDto)
  getAssignedTeacherByStudentId(
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
  ): Promise<Partial<User>> {
    const { id: studentId } = user.studentUserAccount;
    return this.teacherUserService.getAssignedTeacherByStudentId(
      studentId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }

  @Post(`${STUDENT_URL}/register`)
  @UseJwtAuthGuard(null, true)
  @UseSerializeInterceptor(UserResponseDto)
  registerStudent(
    @Body() body: StudentUserCreateDto,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.studentUserService.createStudentUser(
      body,
      UserApprovalStatus.Pending,
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
    return this.studentUserService.updateStudentUser(
      studentUserAccount.id,
      body,
      id,
    );
  }

  // ADMINS

  @Get(`${ADMIN_URL}${TEACHER_URL}/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(TeacherUserResponseDto)
  getTeacherById(
    @Param('teacherId') teacherId: number,
    @Query('sy') schoolYearId?: number,
    @Query('stats') withStats?: number,
  ) {
    return this.teacherUserService.getTeacherById(
      teacherId,
      schoolYearId,
      withStats == 1,
    );
  }

  @Patch(`${ADMIN_URL}`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentAdminUser(
    @Body() body: AdminUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id, adminUserAccount } = user;
    return this.adminUserService.updateAdminUser(adminUserAccount.id, body, id);
  }

  @Patch(`${ADMIN_URL}${TEACHER_URL}/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  updateTeacherByIdAndAdminId(
    @Param('teacherId') teacherId: number,
    @Body() body: TeacherUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.teacherUserService.updateTeacherUser(teacherId, body, user.id);
  }

  @Delete(`${ADMIN_URL}${TEACHER_URL}/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseSerializeInterceptor(UserResponseDto)
  deleteTeacherByIdAndAdminId(
    @Param('teacherId') teacherId: number,
    @CurrentUser() user: User,
  ) {
    return this.teacherUserService.deleteTeacherByIdAndAdminId(
      teacherId,
      user.id,
    );
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
    @Query('sy') schoolYearId?: number,
    @Query('estatus') enrollmentStatus?: string,
  ): Promise<[TeacherUserAccount[], number]> {
    const { id: adminId } = user.adminUserAccount;

    return this.teacherUserService.getPaginationTeachersByAdminId(
      adminId,
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
      own === 1,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
    );
  }

  @Get(`${ADMIN_URL}${TEACHER_URL}/list/all`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(TeacherUserResponseDto)
  getAllTeachersByAdmin(
    @Query('ids') ids: string,
    @Query('q') q: string,
    @Query('status') status?: string | UserApprovalStatus,
    @Query('sy') schoolYearId?: number,
    @Query('estatus')
    enrollmentStatus?: string,
  ) {
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.teacherUserService.getAllTeachers(
      transformedIds,
      q,
      status,
      schoolYearId,
      enrollmentStatus,
    );
  }

  @Get(`${ADMIN_URL}${STUDENT_URL}/list/all`)
  @UseJwtAuthGuard(UserRole.Admin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(TeacherUserResponseDto)
  getAllStudentsByAdmin(
    @Query('ids') ids: string,
    @Query('q') q: string,
    @Query('status') status?: string | UserApprovalStatus,
    @Query('teaid') teacherId?: number,
    @Query('sy') schoolYearId?: number,
    @Query('estatus')
    enrollmentStatus?: string,
  ) {
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.studentUserService.getStudentsByTeacherId(
      teacherId,
      transformedIds,
      q,
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
    );
  }

  @Get(`${ADMIN_URL}${TEACHER_URL}/count`)
  @UseJwtAuthGuard(UserRole.Admin)
  getTeacherCountByAdmin(
    @Query('status') status?: UserApprovalStatus,
    @Query('sy') schoolYearId?: number,
    @Query('estatus') enrollmentStatus?: SchoolYearEnrollmentApprovalStatus,
  ) {
    return this.teacherUserService.getTeacherCountByAdmin(
      status,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      enrollmentStatus,
    );
  }

  @Patch(`${ADMIN_URL}${TEACHER_URL}/approve/:teacherId`)
  @UseJwtAuthGuard(UserRole.Admin)
  approveTeacherByAdminId(
    @CurrentUser() user: User,
    @Param('teacherId') teacherId: number,
    @Body() body: UserApprovalDto,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.teacherUserService.setTeacherApprovalStatus(
      teacherId,
      body,
      user.id,
    );
  }

  // SUPER ADMIN

  @Get(`${SUPER_ADMIN_URL}${ADMIN_URL}/list`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(AdminUserResponseDto)
  getAdminsBySuperAdmin(
    @Query('q') q?: string,
    @Query('status') status?: UserApprovalStatus,
    @Query('sort') sort?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
  ): Promise<[AdminUserAccount[], number]> {
    return this.adminUserService.getPaginationAdmins(
      sort,
      !!take ? take : undefined,
      !!skip ? skip : undefined,
      q,
      status,
    );
  }

  @Get(`${SUPER_ADMIN_URL}${ADMIN_URL}/list/all`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(StudentUserResponseDto)
  getAllAdminsBySuperAdmin(
    @Query('ids') ids: string,
    @Query('q') q: string,
    @Query('status') status?: string | UserApprovalStatus,
  ) {
    const transformedIds = ids?.split(',').map((id) => +id);
    return this.adminUserService.getAdminsBySuperAdmin(
      transformedIds,
      q,
      status,
    );
  }

  @Get(`${SUPER_ADMIN_URL}${ADMIN_URL}/count`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  getAdminCountBySuperAdmin(@Query('status') status?: UserApprovalStatus) {
    return this.adminUserService.getAdminCountBySuperAdmin(status);
  }

  @Get(`${SUPER_ADMIN_URL}${ADMIN_URL}/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseFilterFieldsInterceptor(true)
  @UseSerializeInterceptor(AdminUserResponseDto)
  getAdminByPublicIdAndSuperAdmin(@Param('adminId') adminId: number) {
    return this.adminUserService.getAdminById(adminId);
  }

  @Post(`${SUPER_ADMIN_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerSuperAdmin(@Body() body: SuperAdminUserCreateDto): Promise<User> {
    return this.userService.createSuperAdminUser(body);
  }

  @Post(`${SUPER_ADMIN_URL}${ADMIN_URL}/register`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  registerAdminBySuperAdmin(@Body() body: AdminUserCreateDto): Promise<User> {
    return this.adminUserService.createAdminUser(
      body,
      UserApprovalStatus.Pending,
    );
  }

  @Patch(`${SUPER_ADMIN_URL}${ADMIN_URL}/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  updateAdminByIdAndSuperAdminId(
    @Param('adminId') adminId: number,
    @Body() body: AdminUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.adminUserService.updateAdminUser(adminId, body, user.id);
  }

  @Patch(`${SUPER_ADMIN_URL}${ADMIN_URL}/approve/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  approveAdminBySuperAdmin(
    @CurrentUser() user: User,
    @Param('adminId') adminId: number,
    @Body() body: UserApprovalDto,
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.adminUserService.setAdminApprovalStatus(adminId, body, user.id);
  }

  @Delete(`${SUPER_ADMIN_URL}${ADMIN_URL}/:adminId`)
  @UseJwtAuthGuard(UserRole.SuperAdmin)
  @UseSerializeInterceptor(UserResponseDto)
  deleteAdminByIdAndSuperAdminId(
    @Param('adminId') adminId: number,
    @CurrentUser() user: User,
  ) {
    return this.adminUserService.deleteAdminByIdAndSuperAdminId(
      adminId,
      user.id,
    );
  }
}
