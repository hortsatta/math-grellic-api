import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { StudentUserService } from '#/modules/user/services/student-user.service';
import { TeacherUserService } from '#/modules/user/services/teacher-user.service';
import { SchoolYearEnrollment } from '../entities/school-year-enrollment.entity';
import { SchoolYearEnrollmentCreateDto } from '../dtos/school-year-enrollment-create.dto';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';

@Injectable()
export class SchoolYearEnrollmentService {
  constructor(
    @InjectRepository(SchoolYearEnrollment)
    private readonly repo: Repository<SchoolYearEnrollment>,
    @Inject(StudentUserService)
    private readonly studentUserService: StudentUserService,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
  ) {}

  async validateUsers(userIds: number[], isStudent?: boolean) {
    const users = isStudent
      ? await this.studentUserService.getStudentsByIds(
          userIds,
          UserApprovalStatus.Approved,
        )
      : await this.teacherUserService.getAllTeachers(
          userIds,
          undefined,
          UserApprovalStatus.Approved,
        );

    console.log(userIds, users);

    if (userIds.length !== users.length) {
      return {
        error: new BadRequestException('Please approve selected users first'),
      };
    }

    return { error: null };
  }

  // TODO email

  async create(
    enrollmentDto: SchoolYearEnrollmentCreateDto,
    status?: SchoolYearEnrollmentApprovalStatus,
    isStudent?: boolean,
  ): Promise<SchoolYearEnrollment> {
    const { schoolYearId, userId, teacherId } = enrollmentDto;

    const user = { id: userId };
    const teacherUser = isStudent ? { id: teacherId } : undefined;

    const schoolYearEnrollment = this.repo.create({
      schoolYear: { id: schoolYearId },
      user,
      teacherUser,
      approvalStatus: status,
    });

    return this.repo.save(schoolYearEnrollment);
  }

  async createBatch(
    enrollmentDtos: SchoolYearEnrollmentCreateDto[],
    status?: SchoolYearEnrollmentApprovalStatus,
    isStudent?: boolean,
  ): Promise<SchoolYearEnrollment[]> {
    const transformedEnrollmentDtos = enrollmentDtos.map(
      ({ schoolYearId, userId, teacherId }) => {
        const user = { id: userId };
        const teacherUser = isStudent ? { id: teacherId } : undefined;

        return {
          schoolYear: { id: schoolYearId },
          user,
          teacherUser,
          approvalStatus: status,
        };
      },
    );

    const enrollments = this.repo.create(transformedEnrollmentDtos);
    return this.repo.save(enrollments);
  }
}
