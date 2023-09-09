import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { UseAuthGuard } from '#/common/guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dtos/user-response.dto';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { UserService } from './user.service';
import { UserApprovalStatus, UserRole } from './enums/user.enum';
import { StudentUserResponseDto } from './dtos/student-user-response.dto';

const TEACHERS_BASE_URL = '/teachers';
const STUDENTS_BASE_URL = '/students';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @UseAuthGuard()
  @UseSerializeInterceptor(UserResponseDto)
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('/approve/:id')
  approveUser(
    @Param('id') id: number,
    @Body() body: { approvalStatus: UserApprovalStatus },
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.userService.updateApprovalStatus(id, body.approvalStatus);
  }

  // Teachers endpoint

  @Get(`${TEACHERS_BASE_URL}/:id/students`)
  @UseAuthGuard([UserRole.Admin, UserRole.Teacher])
  @UseSerializeInterceptor(StudentUserResponseDto)
  getStudentsByTeacherId(@Param('id') id: number) {
    return this.userService.findStudentsByTeacherId(id);
  }

  @Post(`${TEACHERS_BASE_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerTeacher(@Body() body: TeacherUserCreateDto): Promise<User> {
    return this.userService.createTeacherUser(body);
  }

  @Patch(`${TEACHERS_BASE_URL}/:id`)
  @UseSerializeInterceptor(UserResponseDto)
  updateTeacher(
    @Param('id') id: number,
    @Body() body: TeacherUserUpdateDto,
  ): Promise<User> {
    return this.userService.updateTeacherUser(id, body);
  }

  // Students endpoint

  @Post(`${STUDENTS_BASE_URL}/register`)
  @UseSerializeInterceptor(UserResponseDto)
  registerStudent(@Body() body: StudentUserCreateDto): Promise<User> {
    return this.userService.createStudentUser(body);
  }

  @Patch(`${STUDENTS_BASE_URL}/:id`)
  @UseSerializeInterceptor(UserResponseDto)
  updateStudent(
    @Param('id') id: number,
    @Body() body: StudentUserUpdateDto,
  ): Promise<User> {
    return this.userService.updateStudentUser(id, body);
  }

  // TODO admin
}
