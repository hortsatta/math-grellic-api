import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { UserApprovalStatus, UserRole } from '#/modules/user/enums/user.enum';
import {
  AuditFeatureType,
  AuditUserAction,
} from '#/modules/audit-log/enums/audit-log.enum';
import { StudentUserCreateDto } from '#/modules/user/dtos/student-user-create.dto';
import { UserLastStepRegisterDto } from '#/modules/user/dtos/user-last-step-register.dto';
import { MailerService } from '#/modules/mailer/mailer.service';
import { AuditLogService } from '#/modules/audit-log/audit-log.service';
import { UserService } from '#/modules/user/services/user.service';
import { StudentUserService } from '#/modules/user/services/student-user.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';
import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearTeacherEnrollmentCreateDto } from '../dtos/school-year-teacher-enrollment-create.dto';
import { SchoolYearStudentEnrollmentCreateDto } from '../dtos/school-year-student-enrollment-create.dto';
import { SchoolYearBatchEnrollmentCreateDto } from '../dtos/school-year-batch-enrollment-create.dto';
import { SchoolYearEnrollmentApprovalDto } from '../dtos/school-year-enrollment-approval.dto';
import { SchoolYearStudentEnrollmentNewStudentCreateDto } from '../dtos/school-year-student-enrollment-new-student-create.dto';
import { SchoolYearService } from './school-year.service';
import { SchoolYearTeacherEnrollmentNewTeacherCreateDto } from '../dtos/school-year-teacher-enrollment-new-teacher-create.dto';
import { TeacherUserCreateDto } from '#/modules/user/dtos/teacher-user-create.dto';

@Injectable()
export class SchoolYearEnrollmentService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(SchoolYearEnrollment)
    private readonly repo: Repository<SchoolYearEnrollment>,
    @Inject(MailerService)
    private readonly mailerService: MailerService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(StudentUserService)
    private readonly studentUserService: StudentUserService,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
    @Inject(forwardRef(() => SchoolYearService))
    private readonly schoolYearService: SchoolYearService,
  ) {}

  async validateUsers(userAccountIds: number[], isStudent?: boolean) {
    const users = isStudent
      ? await this.studentUserService.getStudentsByIds(
          userAccountIds,
          undefined,
          UserApprovalStatus.Approved,
        )
      : await this.teacherUserService.getAllTeachers(
          userAccountIds,
          undefined,
          UserApprovalStatus.Approved,
        );

    if (userAccountIds.length !== users.length) {
      return {
        error: new BadRequestException('Please approve selected users first'),
      };
    }

    return { error: null };
  }

  async validateUserEnrollmentNewToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      // Check if user and enrollment exist
      const user = await this.userService.findOneByEmail(payload.email);
      const enrollment = await this.repo.findOne({
        where: { id: payload.enrollmentId },
      });

      if (!user || !enrollment) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  async confirmUserEnrollmentNewLastStep(
    userLastStepDto: UserLastStepRegisterDto,
  ): Promise<{ publicId: string }> {
    try {
      const { token, password } = userLastStepDto;

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userService.findOneByEmail(payload.email);
      const enrollment = await this.repo.findOne({
        where: { id: payload.enrollmentId },
      });

      if (
        !user ||
        !enrollment ||
        user.approvalStatus === UserApprovalStatus.Rejected ||
        enrollment.approvalStatus ===
          SchoolYearEnrollmentApprovalStatus.Rejected
      ) {
        throw new BadRequestException('Cannot confirm enrollment');
      }

      if (
        user.approvalStatus !== UserApprovalStatus.Pending ||
        enrollment.approvalStatus !== SchoolYearEnrollmentApprovalStatus.Pending
      ) {
        throw new BadRequestException('User already enrolled');
      }

      const { id: userId, role: userRole } = user;

      if (userRole === UserRole.Student) {
        await this.studentUserService.setStudentApprovalStatus(
          user.studentUserAccount.id,
          {
            approvalStatus: UserApprovalStatus.Approved,
            approvalRejectedReason: undefined,
          },
          userId,
          password,
        );

        await this.setStudentApprovalStatus(
          enrollment.id,
          {
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
            approvalRejectedReason: undefined,
          },
          user.id,
        );
      } else {
        await this.teacherUserService.setTeacherApprovalStatus(
          user.teacherUserAccount.id,
          {
            approvalStatus: UserApprovalStatus.Approved,
            approvalRejectedReason: undefined,
          },
          userId,
          password,
        );

        await this.setTeacherApprovalStatus(
          enrollment.id,
          {
            approvalStatus: SchoolYearEnrollmentApprovalStatus.Approved,
            approvalRejectedReason: undefined,
          },
          user.id,
        );
      }

      const updatedUser = await this.userService.getOneByEmail(payload.email);

      return { publicId: updatedUser.publicId };
    } catch (error) {
      throw error;
    }
  }

  async getOneByUserIdAndSchoolYearId(userId: number, schoolYearId?: number) {
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId, userId)
        : await this.schoolYearService.getCurrentSchoolYear(userId);

    if (!schoolYear) {
      return null;
    }

    return this.repo.findOne({
      where: { user: { id: userId }, schoolYear: { id: schoolYear.id } },
    });
  }

  async enrollTeacher(
    enrollmentDto: SchoolYearTeacherEnrollmentCreateDto,
    fromRegister?: boolean,
  ) {
    const { schoolYearId, teacherId } = enrollmentDto;

    const [teacher] = await this.teacherUserService.getAllTeachers(
      [teacherId],
      undefined,
      fromRegister ? UserApprovalStatus.Pending : UserApprovalStatus.Approved,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    // Check if teacher and school year are valid and within enrollment date range
    if (!teacher || schoolYearId !== schoolYear.id) {
      throw new BadRequestException('Cannot enroll teacher');
    } else if (
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      )
    ) {
      throw new BadRequestException('Enrollment has ended');
    }

    const isEnrolled = await this.repo.count({
      where: {
        user: { id: teacher.user.id },
        schoolYear: { id: schoolYear.id },
      },
    });

    // Cancel enrollment if teacher is already enrolled
    if (isEnrolled) {
      throw new BadRequestException('Teacher already enrolled');
    }

    // Set status to pending for self service enrollment,
    // needs student approval
    const enrollment = this.repo.create({
      schoolYear: { id: schoolYear.id },
      user: { id: teacher.user.id },
      approvalStatus: SchoolYearEnrollmentApprovalStatus.Pending,
    });

    return this.repo.save(enrollment);
  }

  async enrollStudent(
    enrollmentDto: SchoolYearStudentEnrollmentCreateDto,
    fromRegister?: boolean,
  ) {
    const {
      schoolYearId,
      teacherId: teacherPublicId,
      studentId,
    } = enrollmentDto;

    const teacher =
      await this.teacherUserService.getTeacherByPublicId(teacherPublicId);

    const [student] = await this.studentUserService.getStudentsByIds(
      [studentId],
      undefined,
      fromRegister ? UserApprovalStatus.Pending : UserApprovalStatus.Approved,
      undefined,
      true,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    // Check if teacher, student, and school year are valid and within enrollment date range
    if (!teacher || !student || schoolYearId !== schoolYear.id) {
      throw new BadRequestException('Cannot enroll student');
    } else if (
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      )
    ) {
      throw new BadRequestException('Enrollment has ended');
    }

    const isEnrolled = await this.repo.count({
      where: {
        user: { id: student.user.id },
        schoolYear: { id: schoolYear.id },
      },
    });

    // Cancel enrollment if student is already enrolled
    if (isEnrolled) {
      throw new BadRequestException('Student already enrolled');
    }

    // Set status to pending for self service enrollment,
    // needs teacher approval
    const enrollment = this.repo.create({
      schoolYear: { id: schoolYear.id },
      user: { id: student.user.id },
      teacherUser: { id: teacher.id },
      approvalStatus: SchoolYearEnrollmentApprovalStatus.Pending,
    });

    return this.repo.save(enrollment);
  }

  async enrollTeachers(enrollmentDto: SchoolYearBatchEnrollmentCreateDto) {
    const { schoolYearId, userAccountIds } = enrollmentDto;

    const { error } = await this.validateUsers(userAccountIds);

    if (error) {
      throw error;
    }

    const teachers = await this.teacherUserService.getAllTeachers(
      userAccountIds,
      undefined,
      UserApprovalStatus.Approved,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    if (
      (!teachers.length || schoolYearId !== schoolYear.id,
      !dayjs().isSameOrBefore(schoolYear?.gracePeriodEndDate))
    ) {
      throw new BadRequestException('Cannot enroll teachers');
    }

    const enrollmentDtos = teachers.map((teacher) => ({
      schoolYearId: schoolYearId,
      userId: teacher.user.id,
    }));

    return this.createBatch(
      enrollmentDtos,
      SchoolYearEnrollmentApprovalStatus.Approved,
    );
  }

  async enrollStudents(
    enrollmentDto: SchoolYearBatchEnrollmentCreateDto,
    teacherId: number,
  ) {
    const { schoolYearId, userAccountIds } = enrollmentDto;

    const { error } = await this.validateUsers(userAccountIds, true);

    if (error) {
      throw error;
    }

    const students = await this.studentUserService.getStudentsByIds(
      userAccountIds,
      undefined,
      UserApprovalStatus.Approved,
      undefined,
      true,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    if (!students.length || schoolYearId !== schoolYear.id) {
      throw new BadRequestException('Cannot enroll students');
    } else if (
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      )
    ) {
      throw new BadRequestException('Enrollment has ended');
    }

    const enrollmentDtos = students.map((student) => ({
      schoolYearId: schoolYearId,
      userId: student.user.id,
    }));

    return this.createBatch(
      enrollmentDtos,
      SchoolYearEnrollmentApprovalStatus.Approved,
      teacherId,
    );
  }

  async createBatch(
    enrollmentDtos: { schoolYearId: number; userId: number }[],
    status: SchoolYearEnrollmentApprovalStatus,
    teacherId?: number,
  ): Promise<SchoolYearEnrollment[]> {
    const transformedEnrollmentDtos = enrollmentDtos.map(
      ({ schoolYearId, userId }) => {
        const user = { id: userId };

        return {
          schoolYear: { id: schoolYearId },
          user,
          approvalStatus: status,
          ...(teacherId && { teacherId }),
        };
      },
    );

    const enrollments = this.repo.create(transformedEnrollmentDtos);
    return this.repo.save(enrollments);
  }

  // ADMINS

  async enrollNewTeacher(
    teacherUserDto: TeacherUserCreateDto,
    teacherEnrollmentDto: SchoolYearTeacherEnrollmentNewTeacherCreateDto,
    userId: number,
  ) {
    try {
      const newTeacher = await this.teacherUserService.createTeacherUser(
        teacherUserDto,
        UserApprovalStatus.Pending,
        userId,
        true,
      );

      const newEnrollment = await this.enrollTeacher(
        {
          ...teacherEnrollmentDto,
          teacherId: newTeacher.teacherUserAccount.id,
        },
        true,
      );

      await this.mailerService.sendUserEnrollmentNewConfirmation(
        newEnrollment.id,
        newTeacher.email,
        newTeacher.teacherUserAccount.firstName,
      );

      return {
        user: newTeacher,
        enrollment: newEnrollment,
      };
    } catch (error) {
      throw error;
    }
  }

  // TEACHERS

  async enrollNewStudent(
    studentUserDto: StudentUserCreateDto,
    studentEnrollmentDto: SchoolYearStudentEnrollmentNewStudentCreateDto,
    teacherPublicId: string,
    userId: number,
  ) {
    try {
      const newStudent = await this.studentUserService.createStudentUser(
        studentUserDto,
        UserApprovalStatus.Pending,
        userId,
        true,
      );

      const newEnrollment = await this.enrollStudent(
        {
          ...studentEnrollmentDto,
          teacherId: teacherPublicId,
          studentId: newStudent.studentUserAccount.id,
        },
        true,
      );

      await this.mailerService.sendUserEnrollmentNewConfirmation(
        newEnrollment.id,
        newStudent.email,
        newStudent.studentUserAccount.firstName,
      );

      return {
        user: newStudent,
        enrollment: newEnrollment,
      };
    } catch (error) {
      throw error;
    }
  }

  async setStudentApprovalStatus(
    enrollmentId: number,
    enrollmentApprovalDto: SchoolYearEnrollmentApprovalDto,
    logUserId: number,
    teacherId?: number,
  ): Promise<{
    approvalStatus: SchoolYearEnrollment['approvalStatus'];
    approvalDate: SchoolYearEnrollment['approvalDate'];
    approvalRejectedReason: SchoolYearEnrollment['approvalRejectedReason'];
  }> {
    const { approvalStatus, approvalRejectedReason } = enrollmentApprovalDto;

    const enrollment = await this.repo.findOne({
      where: {
        id: enrollmentId,
        ...(teacherId && { teacherUser: { user: { id: teacherId } } }),
      },
      relations: { user: { studentUserAccount: true }, schoolYear: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const { user: studentUser, schoolYear, ...moreEnrollment } = enrollment;

    const updatedEnrollment = await this.repo.save({
      ...moreEnrollment,
      ...enrollmentApprovalDto,
    });

    // Send a notification email to user
    approvalStatus === SchoolYearEnrollmentApprovalStatus.Approved
      ? this.mailerService.sendUserEnrollmentApproved(
          schoolYear.title,
          studentUser.email,
          studentUser.studentUserAccount.firstName,
        )
      : this.mailerService.sendUserEnrollmentRejected(
          approvalRejectedReason || '',
          schoolYear.title,
          studentUser.email,
          studentUser.studentUserAccount.firstName,
        );

    // Log approval status
    this.auditLogService.create(
      {
        actionName: AuditUserAction.setEnrollmentApprovalStatus,
        actionValue: approvalStatus,
        featureId: studentUser.id,
        featureType: AuditFeatureType.schoolYearEnrollment,
      },
      logUserId,
    );

    return {
      approvalStatus,
      approvalDate: updatedEnrollment.approvalDate,
      approvalRejectedReason: updatedEnrollment.approvalRejectedReason,
    };
  }

  async setTeacherApprovalStatus(
    enrollmentId: number,
    enrollmentApprovalDto: SchoolYearEnrollmentApprovalDto,
    logUserId: number,
  ): Promise<{
    approvalStatus: SchoolYearEnrollment['approvalStatus'];
    approvalDate: SchoolYearEnrollment['approvalDate'];
    approvalRejectedReason: SchoolYearEnrollment['approvalRejectedReason'];
  }> {
    const { approvalStatus, approvalRejectedReason } = enrollmentApprovalDto;

    const enrollment = await this.repo.findOne({
      where: {
        id: enrollmentId,
      },
      relations: { user: { teacherUserAccount: true }, schoolYear: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const { user: teacherUser, schoolYear, ...moreEnrollment } = enrollment;

    const updatedEnrollment = await this.repo.save({
      ...moreEnrollment,
      ...enrollmentApprovalDto,
    });

    // Send a notification email to user
    approvalStatus === SchoolYearEnrollmentApprovalStatus.Approved
      ? this.mailerService.sendUserEnrollmentApproved(
          schoolYear.title,
          teacherUser.email,
          teacherUser.teacherUserAccount.firstName,
        )
      : this.mailerService.sendUserEnrollmentRejected(
          approvalRejectedReason || '',
          schoolYear.title,
          teacherUser.email,
          teacherUser.teacherUserAccount.firstName,
        );

    // Log approval status
    this.auditLogService.create(
      {
        actionName: AuditUserAction.setEnrollmentApprovalStatus,
        actionValue: approvalStatus,
        featureId: teacherUser.id,
        featureType: AuditFeatureType.schoolYearEnrollment,
      },
      logUserId,
    );

    return {
      approvalStatus,
      approvalDate: updatedEnrollment.approvalDate,
      approvalRejectedReason: updatedEnrollment.approvalRejectedReason,
    };
  }
}
