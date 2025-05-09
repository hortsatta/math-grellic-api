import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';

import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { SchoolYearEnrollmentApprovalStatus } from '#/modules/school-year/enums/school-year-enrollment.enum';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { StudentUserService } from '#/modules/user/services/student-user.service';
import { LessonScheduleService } from '#/modules/lesson/services/lesson-schedule.service';
import { TeacherExamScheduleService } from '#/modules/exam/services/teacher-exam-schedule.service';
import { MeetingSchedule } from '../entities/meeting-schedule.entity';
import { MeetingScheduleCreateDto } from '../dtos/meeting-schedule-create.dto';
import { MeetingScheduleUpdateDto } from '../dtos/meeting-schedule-update.dto';

@Injectable()
export class TeacherScheduleService {
  constructor(
    @InjectRepository(MeetingSchedule)
    private readonly repo: Repository<MeetingSchedule>,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
    @Inject(StudentUserService)
    private readonly studentUserService: StudentUserService,
    @Inject(LessonScheduleService)
    private readonly lessonScheduleService: LessonScheduleService,
    @Inject(forwardRef(() => TeacherExamScheduleService))
    private readonly teacherExamScheduleService: TeacherExamScheduleService,
  ) {}

  async validateScheduleUpsert(
    startDate: Date,
    endDate: Date,
    teacherId: number,
    schoolYearId: number,
    studentIds?: number[],
    scheduleId?: number,
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

    // Check students if meeting conflicts with exam schedule
    const examSchedules =
      await this.teacherExamScheduleService.getByStartAndEndDateAndTeacherId(
        startDate,
        endDate,
        teacherId,
        schoolYearId,
      );

    if (examSchedules.length) {
      if (!studentIds?.length) {
        return {
          error: new ConflictException(
            'The new schedule conflicts with an exam schedule',
          ),
        };
      } else {
        const isConflict = examSchedules.some(({ students }) => {
          const isPresent = students.some(
            (student) => !!studentIds.find((id) => student.id === id),
          );

          return isPresent;
        });

        if (isConflict) {
          return {
            error: new ConflictException(
              'The new schedule conflicts with an exam schedule',
            ),
          };
        }
      }
    }

    // TEACHER
    // Check if schedule date overlaps with existing schedules of other meeting by teacher
    const scheduleOverlapBaseWhere: FindOptionsWhere<MeetingSchedule> =
      scheduleId
        ? {
            id: Not(scheduleId),
            startDate: LessThan(endDate),
            endDate: MoreThan(startDate),
            teacher: { id: teacherId },
          }
        : {
            startDate: LessThan(endDate),
            endDate: MoreThan(startDate),
            teacher: { id: teacherId },
          };

    const scheduleOverlapCount = await this.repo.count({
      where: scheduleOverlapBaseWhere,
    });

    if (scheduleOverlapCount) {
      return {
        error: new ConflictException(
          'The new schedule conflicts with an existing one',
        ),
      };
    }

    return { error: null };
  }

  async getPaginationTeacherMeetingSchedulesByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    schoolYearId?: number,
  ): Promise<[MeetingSchedule[], number]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<MeetingSchedule> = {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<MeetingSchedule> => {
      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (!sortBy || sortBy === 'scheduleDate') {
        return { startDate: (sortOrder || 'DESC') as FindOptionsOrderValue };
      }

      return { [sortBy]: sortOrder };
    };

    return this.repo.findAndCount({
      where: generateWhere(),
      order: generateOrder(),
      skip,
      take,
    });
  }

  getByStartAndEndDateAndTeacherId(
    startDate: Date,
    endDate: Date,
    teacherId: number,
  ): Promise<MeetingSchedule[]> {
    return this.repo.find({
      where: {
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
        teacher: { id: teacherId },
      },
      relations: {
        students: true,
      },
    });
  }

  async getTimelineSchedulesByDateRangeAndTeacherId(
    fromDate: Date,
    toDate: Date,
    teacherId: number,
    schoolYearId?: number,
  ) {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const lessonSchedules =
      await this.lessonScheduleService.getByDateRangeAndTeacherId(
        fromDate,
        toDate,
        teacherId,
        schoolYear.id,
      );

    const examSchedules =
      await this.teacherExamScheduleService.getByDateRangeAndTeacherId(
        fromDate,
        toDate,
        teacherId,
        schoolYear.id,
      );

    const meetingSchedules = await this.repo.find({
      where: {
        startDate: Between(fromDate, toDate),
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      },
      order: { startDate: 'ASC' },
    });

    return { lessonSchedules, examSchedules, meetingSchedules };
  }

  async create(
    meetingScheduleDto: MeetingScheduleCreateDto,
    teacherId: number,
  ): Promise<MeetingSchedule> {
    const {
      studentIds,
      startDate,
      endDate,
      schoolYearId,
      ...moreMeetingScheduleDto
    } = meetingScheduleDto;

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    // Validate data before creation
    const { error: scheduleError } = await this.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      schoolYear.id,
      studentIds,
    );

    if (scheduleError) {
      throw scheduleError;
    }

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    const meetingSchedule = this.repo.create({
      ...moreMeetingScheduleDto,
      startDate,
      endDate,
      students,
      teacher: { id: teacherId },
      schoolYear: { id: schoolYear.id },
    });

    return this.repo.save(meetingSchedule);
  }

  async update(
    id: number,
    meetingScheduleDto: MeetingScheduleUpdateDto,
    teacherId: number,
  ): Promise<MeetingSchedule> {
    const { studentIds, startDate, endDate, ...moreMeetingScheduleDto } =
      meetingScheduleDto;

    // Get meeting schedule, cancel schedule update and throw error if not found
    const meetingSchedule = await this.repo.findOne({
      where: { id },
      relations: { schoolYear: true },
    });
    if (!meetingSchedule) {
      throw new NotFoundException('Exam schedule not found');
    }

    // Validate data before update
    const { error: scheduleError } = await this.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      meetingSchedule.schoolYear.id,
      studentIds,
      id,
    );

    if (scheduleError) {
      throw scheduleError;
    }

    const students = studentIds?.length
      ? studentIds.map((id) => ({ id }))
      : null;

    return this.repo.save({
      ...moreMeetingScheduleDto,
      startDate,
      endDate,
      students,
      id: meetingSchedule.id,
    });
  }

  async delete(id: number, teacherId: number): Promise<boolean> {
    const schedule = await this.repo.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const result = await this.repo.delete({ id });
    return !!result.affected;
  }
}
