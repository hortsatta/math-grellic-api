import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { UserApprovalStatus } from '../user/enums/user.enum';
import { SchoolYearEnrollmentApprovalStatus } from '../school-year/enums/school-year-enrollment.enum';
import { TeacherUserService } from '../user/services/teacher-user.service';
import { StudentUserService } from '../user/services/student-user.service';
import { SchoolYearService } from '../school-year/services/school-year.service';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementCreateDto } from './dtos/announcement-create.dto';
import { AnnouncementUpdateDto } from './dtos/announcement-update.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
    @Inject(TeacherUserService)
    private readonly teacherUserService: TeacherUserService,
    @Inject(StudentUserService)
    private readonly studentUserService: StudentUserService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
  ) {}

  async validateAnnouncementUpsert(
    schoolYearId: number,
    studentIds?: number[],
  ) {
    // STUDENT
    // Check if all specified student ids are valid
    if (studentIds?.length) {
      const students = await this.studentUserService.getStudentsByIds(
        studentIds,
        schoolYearId,
        UserApprovalStatus.Approved,
        SchoolYearEnrollmentApprovalStatus.Approved,
      );

      if (students.length !== studentIds.length) {
        return {
          error: new BadRequestException(
            'One of the selected student is invalid',
          ),
        };
      }
    }

    return { error: null };
  }

  // TEACHERS

  async getAnnouncementsByTeacherId(teacherId: number, schoolYearId?: number) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const today = dayjs().toDate();

    const currentAnnouncements = await this.repo.find({
      where: {
        teacher: { id: teacherId },
        startDate: LessThanOrEqual(today),
        schoolYear: { id: schoolYear.id },
      },
      order: { startDate: 'DESC' },
      take: 3,
    });

    const upcomingAnnouncements = await this.repo.find({
      where: {
        teacher: { id: teacherId },
        startDate: MoreThan(today),
        schoolYear: { id: schoolYear.id },
      },
      order: { startDate: 'ASC' },
      take: 3,
    });

    return {
      currentAnnouncements,
      upcomingAnnouncements,
    };
  }

  getAnnouncementByIdAndTeacherId(id: number, teacherId: number) {
    return this.repo.findOne({
      where: { id, teacher: { id: teacherId } },
    });
  }

  async create(
    announcementDto: AnnouncementCreateDto,
    teacherId: number,
  ): Promise<Announcement> {
    const { studentIds, startDate, schoolYearId, ...moreAnnouncementDto } =
      announcementDto;

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    // Validate data before creation
    const { error } = await this.validateAnnouncementUpsert(
      schoolYear.id,
      studentIds,
    );

    if (error) {
      throw error;
    }

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    const announcement = this.repo.create({
      ...moreAnnouncementDto,
      startDate,
      students,
      teacher: { id: teacherId },
      schoolYear: { id: schoolYear.id },
    });

    return this.repo.save(announcement);
  }

  async update(
    id: number,
    announcementDto: AnnouncementUpdateDto,
    teacherId: number,
  ): Promise<Announcement> {
    const { studentIds, startDate, ...moreAnnouncementDto } = announcementDto;

    // Get announcement, cancel announcement update and throw error if not found
    const announcement = await this.repo.findOne({
      where: { id, teacher: { id: teacherId } },
      relations: { schoolYear: true },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Validate data before update
    const { error } = await this.validateAnnouncementUpsert(
      announcement.schoolYear.id,
      studentIds,
    );

    if (error) {
      throw error;
    }

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    return this.repo.save({
      ...moreAnnouncementDto,
      startDate,
      students,
      id: announcement.id,
    });
  }

  async delete(id: number, teacherId: number): Promise<boolean> {
    const announcement = await this.repo.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const result = await this.repo.delete({ id });
    return !!result.affected;
  }

  // STUDENTS

  async getAnnouncementsByStudentId(studentId: number, schoolYearId?: number) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const today = dayjs().toDate();

    // Get student teacher
    const teacher = await this.teacherUserService.getTeacherByStudentId(
      studentId,
      schoolYear.id,
    );

    if (!teacher) {
      throw new NotFoundException('Student not found');
    }

    const currentAnnouncements = await this.repo.find({
      where: [
        {
          teacher: { id: teacher.id },
          startDate: LessThanOrEqual(today),
          students: { id: studentId },
          schoolYear: { id: schoolYear.id },
        },
        {
          teacher: { id: teacher.id },
          startDate: LessThanOrEqual(today),
          students: { id: IsNull() },
          schoolYear: { id: schoolYear.id },
        },
      ],
      order: { startDate: 'DESC' },
      take: 3,
    });

    const upcomingAnnouncements = await this.repo.find({
      where: [
        {
          teacher: { id: teacher.id },
          startDate: MoreThan(today),
          students: { id: studentId },
          schoolYear: { id: schoolYear.id },
        },
        {
          teacher: { id: teacher.id },
          startDate: MoreThan(today),
          students: { id: IsNull() },
          schoolYear: { id: schoolYear.id },
        },
      ],
      order: { startDate: 'ASC' },
      take: 3,
    });

    const transformedUpcomingAnnouncements = upcomingAnnouncements.map(
      (announcement) => ({ startDate: announcement.startDate }),
    );

    return {
      currentAnnouncements,
      upcomingAnnouncements: transformedUpcomingAnnouncements,
    };
  }

  async getAnnouncementByIdAndStudentId(id: number, studentId: number) {
    const announcement = await this.repo.findOne({
      where: { id },
      relations: { schoolYear: true },
    });

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    // Get student teacher
    const teacher = await this.teacherUserService.getTeacherByStudentId(
      studentId,
      announcement.schoolYear.id,
    );

    if (!teacher) {
      throw new NotFoundException('Student not found');
    }

    return this.repo.findOne({
      where: { id, teacher: { id: teacher.id } },
    });
  }
}
