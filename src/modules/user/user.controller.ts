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
import { UseAuthGuard } from '#/common/guards/auth.guard';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { UserResponseDto } from './dtos/user-response.dto';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { StudentUserResponseDto } from './dtos/student-user-response.dto';
import { UserService } from './user.service';

const TEACHER_URL = '/teachers';
const STUDENT_URL = '/students';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @UseAuthGuard()
  @UseSerializeInterceptor(UserResponseDto)
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('/approve/:studentId')
  @UseAuthGuard([UserRole.Admin, UserRole.Teacher])
  approveUser(
    @CurrentUser() user: User,
    @Param('studentId') studentId: number,
    @Body() body: { approvalStatus: UserApprovalStatus },
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    const { id: teacherId } = user.teacherUserAccount || {};

    return this.userService.setStudentApprovalStatus(
      studentId,
      body.approvalStatus,
      teacherId,
    );
  }

  // TEACHERS

  @Get(`${TEACHER_URL}${STUDENT_URL}/list`)
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
  getStudentCountByTeacherId(
    @CurrentUser() user: User,
    @Query('status') status?: UserApprovalStatus,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.userService.getStudentCountByTeacherId(teacherId, status);
  }

  // @Get(`${TEACHER_URL}${STUDENT_URL}/:publicId`)
  @Get(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseAuthGuard(UserRole.Teacher)
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
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentTeacherUser(
    @Body() body: TeacherUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.userService.updateTeacherUser(teacherId, body);
  }

  @Patch(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  updateStudentByIdAndTeacherId(
    @Param('studentId') studentId: number,
    @Body() body: StudentUserUpdateDto,
  ) {
    return this.userService.updateStudentUser(studentId, body);
  }

  @Delete(`${TEACHER_URL}${STUDENT_URL}/:studentId`)
  @UseAuthGuard(UserRole.Teacher)
  @UseSerializeInterceptor(UserResponseDto)
  deleteStudentByIdAndTeacherId(
    @Param('studentId') studentId: number,
    @CurrentUser() user: User,
  ) {
    const { id: teacherId } = user.teacherUserAccount;
    return this.userService.deleteStudentByIdAndTeacherId(studentId, teacherId);
  }

  @Post(`${TEACHER_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerTeacher(@Body() body: TeacherUserCreateDto): Promise<User> {
    return this.userService.createTeacherUser(body);
  }

  // TODO
  // @Patch(`${TEACHER_URL}/:id`)
  // @UseAuthGuard(UserRole.Teacher)
  // @UseSerializeInterceptor(UserResponseDto)
  // updateTeacher(
  //   @Param('id') id: number,
  //   @Body() body: TeacherUserUpdateDto,
  // ): Promise<User> {
  //   return this.userService.updateTeacherUser(id, body);
  // }

  // STUDENTS

  @Get(`${STUDENT_URL}/teacher`)
  @UseSerializeInterceptor(UserResponseDto)
  getAssignedTeacherByStudentId(
    @CurrentUser() user: User,
  ): Promise<Partial<User>> {
    const { id: studentId } = user.studentUserAccount;
    return this.userService.getAssignedTeacherByStudentId(studentId);
  }

  @Post(`${STUDENT_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerStudent(@Body() body: StudentUserCreateDto): Promise<User> {
    return this.userService.createStudentUser(body);
  }

  @Patch(`${STUDENT_URL}`)
  @UseAuthGuard(UserRole.Student)
  @UseSerializeInterceptor(UserResponseDto)
  updateCurrentStudentUser(
    @Body() body: StudentUserUpdateDto,
    @CurrentUser() user: User,
  ) {
    const { id: studentId } = user.studentUserAccount;
    return this.userService.updateStudentUser(studentId, body);
  }

  // TODO
  // @Patch(`${STUDENT_URL}/:id`)
  // @UseAuthGuard(UserRole.Student)
  // @UseSerializeInterceptor(UserResponseDto)
  // updateStudent(
  //   @Param('id') id: number,
  //   @Body() body: StudentUserUpdateDto,
  // ): Promise<User> {
  //   return this.userService.updateStudentUser(id, body);
  // }

  // TODO admin
}
