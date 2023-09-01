import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { SerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dtos/user-response.dto';
import { TeacherUserCreateDto } from './dtos/teacher-user-create.dto';
import { StudentUserCreateDto } from './dtos/student-user-create.dto';
import { TeacherUserUpdateDto } from './dtos/teacher-user-update.dto';
import { StudentUserUpdateDto } from './dtos/student-user-update.dto';
import { UserService } from './user.service';
import { UserApprovalStatus } from './enums/user.enum';

const AUTH_PATH = '/auth';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(`${AUTH_PATH}/me`)
  @SerializeInterceptor(UserResponseDto)
  me(@CurrentUser() user: User): User {
    if (!user) {
      throw new UnauthorizedException('No user session found');
    }
    return user;
  }

  @Post(`${AUTH_PATH}/register-teacher`)
  @SerializeInterceptor(UserResponseDto)
  registerTeacher(@Body() body: TeacherUserCreateDto): Promise<User> {
    return this.userService.createTeacherUser(body);
  }

  @Post(`${AUTH_PATH}/register-student`)
  @SerializeInterceptor(UserResponseDto)
  registerStudent(@Body() body: StudentUserCreateDto): Promise<User> {
    return this.userService.createStudentUser(body);
  }

  @Patch(`${AUTH_PATH}/approve/:id`)
  approveUser(
    @Param('id') id: number,
    @Body() body: { approvalStatus: UserApprovalStatus },
  ): Promise<{
    approvalStatus: User['approvalStatus'];
    approvalDate: User['approvalDate'];
  }> {
    return this.userService.updateApprovalStatus(id, body.approvalStatus);
  }

  @Patch('/teacher/:id')
  @SerializeInterceptor(UserResponseDto)
  updateTeacher(
    @Param('id') id: number,
    @Body() body: TeacherUserUpdateDto,
  ): Promise<User> {
    return this.userService.updateTeacherUser(id, body);
  }

  @Patch('/student/:id')
  @SerializeInterceptor(UserResponseDto)
  updateStudent(
    @Param('id') id: number,
    @Body() body: StudentUserUpdateDto,
  ): Promise<User> {
    return this.userService.updateStudentUser(id, body);
  }

  // TODO admin
}
