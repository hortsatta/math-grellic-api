import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { StudentUserService } from '#/modules/user/services/student-user.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';
import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearTeacherEnrollmentCreateDto } from '../dtos/school-year-teacher-enrollment-create.dto';
import { SchoolYearStudentEnrollmentCreateDto } from '../dtos/school-year-student-enrollment-create.dto';
import { SchoolYearBatchEnrollmentCreateDto } from '../dtos/school-year-batch-enrollment-create.dto';
import { SchoolYearService } from './school-year.service';

@Injectable()
export class SchoolYearEnrollmentService {
  constructor(
    @InjectRepository(SchoolYearEnrollment)
    private readonly repo: Repository<SchoolYearEnrollment>,
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

  async getOneByUserIdAndSchoolYearId(userId: number, schoolYearId?: number) {
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(userId, schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear(userId);

    if (!schoolYear) {
      return null;
    }

    return this.repo.findOne({
      where: { user: { id: userId }, schoolYear: { id: schoolYear.id } },
    });
  }

  async enrollTeacher(enrollmentDto: SchoolYearTeacherEnrollmentCreateDto) {
    const { schoolYearId, teacherId } = enrollmentDto;

    const [teacher] = await this.teacherUserService.getAllTeachers(
      [teacherId],
      undefined,
      UserApprovalStatus.Approved,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    // Check if teacher and school year are valid and within enrollment date range
    if (
      (!teacher || schoolYearId !== schoolYear.id,
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      ))
    ) {
      throw new BadRequestException('Cannot enroll teacher');
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

  async enrollStudent(enrollmentDto: SchoolYearStudentEnrollmentCreateDto) {
    const { schoolYearId, teacherId, studentId } = enrollmentDto;

    const teacher =
      await this.teacherUserService.getTeacherByPublicId(teacherId);

    const [student] = await this.studentUserService.getStudentsByIds(
      [studentId],
      UserApprovalStatus.Approved,
      true,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    // Check if teacher, student, and school year are valid and within enrollment date range
    if (
      (!teacher || !student || schoolYearId !== schoolYear.id,
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      ))
    ) {
      throw new BadRequestException('Cannot enroll student');
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
      UserApprovalStatus.Approved,
      true,
    );

    const schoolYear = await this.schoolYearService.getCurrentSchoolYear();

    if (
      (!students.length || schoolYearId !== schoolYear.id,
      !dayjs().isBetween(
        schoolYear?.enrollmentStartDate,
        schoolYear?.gracePeriodEndDate,
        null,
        '[]',
      ))
    ) {
      throw new BadRequestException('Cannot enroll students');
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
}
