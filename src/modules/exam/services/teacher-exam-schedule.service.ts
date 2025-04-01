import {
  Injectable,
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  Not,
  In,
  MoreThan,
  LessThan,
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { UserService } from '#/modules/user/user.service';
import { TeacherScheduleService } from '#/modules/schedule/schedules/teacher-schedule.service';
import { ExamSchedule } from '../entities/exam-schedule.entity';
import { Exam } from '../entities/exam.entity';
import { ExamScheduleCreateDto } from '../dtos/exam-schedule-create.dto';
import { ExamScheduleUpdateDto } from '../dtos/exam-schedule-update.dto';

@Injectable()
export class TeacherExamScheduleService {
  constructor(
    @InjectRepository(ExamSchedule)
    private readonly repo: Repository<ExamSchedule>,
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(forwardRef(() => TeacherScheduleService))
    private readonly teacherMeetingScheduleService: TeacherScheduleService,
  ) {}

  async validateScheduleUpsert(
    startDate: Date,
    endDate: Date,
    teacherId: number,
    studentIds?: number[],
    examId?: number,
    scheduleId?: number,
  ) {
    const currentDateTime = dayjs().toDate();

    if (
      // Check if dates are valid
      !dayjs(startDate).isValid() ||
      !dayjs(endDate).isValid() ||
      // Start date should be before end date
      dayjs(endDate).isSameOrBefore(startDate)
    ) {
      return { error: new BadRequestException('Schedule is invalid') };
    } else if (
      // Dates should not be before (past) current date (today)
      dayjs(endDate).isSameOrBefore(currentDateTime)
    ) {
      return {
        error: new BadRequestException(
          'Cannot set schedule before current date and time',
        ),
      };
    }

    if (dayjs(endDate).diff(currentDateTime, 'minute') < 10) {
      // If new end date has less that 10 minute difference from present date and time, prevent upsert
      return {
        error: new BadRequestException(
          'Cannot set end time too close to current time',
        ),
      };
    }

    // Exam schedule can only be upsert if exam is published
    if (examId) {
      const exam = await this.examRepo.findOne({ where: { id: examId } });

      if (exam.status !== RecordStatus.Published) {
        return {
          error: new BadRequestException(
            'Cannot set schedule if exam is not published',
          ),
        };
      }
    }

    // FOR UPDATE
    if (scheduleId != null) {
      const schedule = await this.repo.findOne({ where: { id: scheduleId } });

      // If schedule end date is already passed the present date and time, prevent update
      if (dayjs(schedule.endDate).isSameOrBefore(currentDateTime)) {
        return {
          error: new BadRequestException(
            'Cannot update a schedule that has already passed current date and time',
          ),
        };
      }

      // FOR ONGOING SCHEDULE
      if (dayjs(schedule.startDate).isSameOrBefore(currentDateTime)) {
        if (
          // If schedule end date has less than 10 minutes left, prevent updating,
          // only accept update if end date is more or equal to 10 minutes left
          dayjs(schedule.endDate).diff(currentDateTime, 'minute') < 10
        ) {
          return {
            error: new BadRequestException(
              'Cannot update an ongoing schedule that is close to ending',
            ),
          };
        }
      }

      // FOR FUTURE SCHEDULE SET TO ONGOING
      // If new dates are going to set the schedule to ongoing
      // then prevent if end date is less than 10 minutes from current date and time
      if (
        dayjs(schedule.startDate).isAfter(currentDateTime) &&
        dayjs(startDate).isSameOrBefore(currentDateTime) &&
        dayjs(endDate).diff(currentDateTime, 'minute') < 10
      ) {
        return {
          error: new BadRequestException(
            'Cannot set schedule to ongoing with new end time so close to current time',
          ),
        };
      }
    }

    // STUDENT
    let targetStudentIds = studentIds || [];
    // Get all students by teacher id if studentIds is null
    if (!targetStudentIds.length) {
      const allStudents = await this.userService.getStudentsByTeacherId(
        teacherId,
        null,
        null,
        UserApprovalStatus.Approved,
      );
      targetStudentIds = allStudents.map((student) => student.id);
    } else {
      // Check if all student ids are valid and approved
      const students = await this.userService.getStudentsByIds(
        targetStudentIds,
        UserApprovalStatus.Approved,
      );

      if (students.length !== targetStudentIds.length) {
        return {
          error: new BadRequestException(
            'One of the selected student is invalid',
          ),
        };
      }
    }

    // Check students if meeting conflicts with exam schedule
    const meetingSchedules =
      await this.teacherMeetingScheduleService.getByStartAndEndDateAndTeacherId(
        startDate,
        endDate,
        teacherId,
      );

    if (meetingSchedules.length) {
      const isConflict = meetingSchedules.some(({ students }) => {
        if (!students?.length) {
          return true;
        }

        const isPresent = students.some(
          (student) => !!targetStudentIds.find((id) => student.id === id),
        );

        return isPresent;
      });

      if (isConflict) {
        return {
          error: new ConflictException(
            'The new schedule conflicts with an meeting schedule',
          ),
        };
      }
    }

    // Check for ongoing and future schedules for the target exam,
    // only allow if assigned students don't have a schedule yet.
    // fyi, students can retake exams
    if (examId) {
      const targetExamOverlapBaseWhere: FindOptionsWhere<ExamSchedule> =
        scheduleId
          ? {
              id: Not(scheduleId),
              students: { id: In(targetStudentIds) },
              exam: { id: examId, teacher: { id: teacherId } },
            }
          : {
              students: { id: In(targetStudentIds) },
              exam: { id: examId, teacher: { id: teacherId } },
            };

      const targetExamOverlapCount = await this.repo.count({
        where: [
          // Get ongoing schedules
          {
            startDate: LessThan(currentDateTime),
            endDate: MoreThan(currentDateTime),
            ...targetExamOverlapBaseWhere,
          },
          // Get future schedules
          {
            startDate: MoreThanOrEqual(currentDateTime),
            ...targetExamOverlapBaseWhere,
          },
        ],
      });

      if (targetExamOverlapCount) {
        return {
          error: new ConflictException(
            'Assigned student(s) has conflicting schedules',
          ),
        };
      }
    }

    // Check for ongoing or future schedules from the teacher's other exams .
    // Only allow if assigned students don't have conflicting schedules from
    // other exams (not target exam)
    const otherExamsOverlapBaseWhere: FindOptionsWhere<ExamSchedule> =
      scheduleId
        ? {
            id: Not(scheduleId),
            startDate: LessThanOrEqual(endDate),
            endDate: MoreThanOrEqual(startDate),
            students: { id: In(targetStudentIds) },
            exam: { teacher: { id: teacherId } },
          }
        : {
            startDate: LessThanOrEqual(endDate),
            endDate: MoreThanOrEqual(startDate),
            students: { id: In(targetStudentIds) },
            exam: { teacher: { id: teacherId } },
          };

    const otherExamsOverlapCount = await this.repo.count({
      where: otherExamsOverlapBaseWhere,
    });

    if (otherExamsOverlapCount) {
      return {
        error: new ConflictException(
          'Assigned student(s) has conflicting schedules',
        ),
      };
    }

    return { error: null };
  }

  getOneById(id: number): Promise<ExamSchedule> {
    return this.repo.findOne({ where: { id }, relations: { exam: true } });
  }

  getByStartAndEndDateAndTeacherId(
    startDate: Date,
    endDate: Date,
    teacherId: number,
  ): Promise<ExamSchedule[]> {
    return this.repo.find({
      where: {
        startDate: LessThan(endDate),
        endDate: MoreThan(startDate),
        exam: { teacher: { id: teacherId } },
      },
      relations: {
        students: true,
        exam: true,
      },
    });
  }

  getByDateRangeAndTeacherId(fromDate: Date, toDate: Date, teacherId: number) {
    return this.repo.find({
      where: {
        startDate: Between(fromDate, toDate),
        exam: { status: RecordStatus.Published, teacher: { id: teacherId } },
      },
      relations: { exam: true },
      order: { startDate: 'ASC' },
    });
  }

  async create(
    examScheduleDto: ExamScheduleCreateDto,
    teacherId: number,
  ): Promise<ExamSchedule> {
    const { examId, startDate, endDate, studentIds, ...moreExamScheduleDto } =
      examScheduleDto;

    let students = studentIds?.length ? studentIds.map((id) => ({ id })) : [];
    if (!students.length) {
      const allStudents = await this.userService.getStudentsByTeacherId(
        teacherId,
        null,
        null,
        UserApprovalStatus.Approved,
      );
      students = allStudents.map(({ id }) => ({ id }));
    }

    this.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      studentIds,
      examId,
    );

    const examSchedule = this.repo.create({
      ...moreExamScheduleDto,
      startDate,
      endDate,
      students,
      exam: { id: examId },
    });

    return this.repo.save(examSchedule);
  }

  async update(
    id: number,
    examScheduleDto: ExamScheduleUpdateDto,
    teacherId: number,
  ): Promise<ExamSchedule> {
    const { startDate, endDate, studentIds, ...moreExamScheduleDto } =
      examScheduleDto;
    // Get exam schedule, cancel schedule update and throw error if not found
    const examSchedule = await this.getOneById(id);
    if (!examSchedule) {
      throw new NotFoundException('Exam schedule not found');
    }

    let students = studentIds?.length ? studentIds.map((id) => ({ id })) : [];
    if (!students.length) {
      const allStudents = await this.userService.getStudentsByTeacherId(
        teacherId,
        null,
        null,
        UserApprovalStatus.Approved,
      );
      students = allStudents.map(({ id }) => ({ id }));
    }

    this.validateScheduleUpsert(
      startDate,
      endDate,
      teacherId,
      studentIds,
      examSchedule.exam.id,
    );

    return this.repo.save({
      ...examSchedule,
      ...moreExamScheduleDto,
      startDate,
      endDate,
      students,
      exam: examSchedule.exam,
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return !!result.affected;
  }
}
