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
  FindOptionsWhere,
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { UserApprovalStatus } from '../user/enums/user.enum';
import { UserService } from '../user/user.service';
import { ScheduleService } from '../schedule/schedule.service';
import { ExamSchedule } from './entities/exam-schedule.entity';
import { ExamScheduleCreateDto } from './dtos/exam-schedule-create.dto';
import { ExamScheduleUpdateDto } from './dtos/exam-schedule-update.dto';

@Injectable()
export class ExamScheduleService {
  constructor(
    @InjectRepository(ExamSchedule)
    private readonly repo: Repository<ExamSchedule>,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(forwardRef(() => ScheduleService))
    private readonly meetingScheduleService: ScheduleService,
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
      await this.meetingScheduleService.getByStartAndEndDateAndTeacherId(
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

    // If this exam has multiple schedules then check if target student is present on others schedule,
    // If student is present and schedule is future then return as invalid (false)
    // TODO check if student has completion with exam, cancel if exam already taken
    if (examId) {
      const studentOverlapBaseWhere: FindOptionsWhere<ExamSchedule> = scheduleId
        ? {
            id: Not(scheduleId),
            students: { id: In(targetStudentIds) },
            exam: { id: examId, teacher: { id: teacherId } },
          }
        : {
            students: { id: In(targetStudentIds) },
            exam: { id: examId, teacher: { id: teacherId } },
          };

      const studentOverlapCount = await this.repo.count({
        where: [
          {
            startDate: MoreThan(currentDateTime),
            ...studentOverlapBaseWhere,
          },
          {
            endDate: MoreThan(currentDateTime),
            ...studentOverlapBaseWhere,
          },
        ],
      });

      if (studentOverlapCount) {
        return {
          error: new ConflictException(
            'Assigned student(s) has conflicting schedules',
          ),
        };
      }
    }

    // TEACHER
    // Check if schedule date overlaps with existing schedules of other exams by teacher
    const scheduleOverlapBaseWhere: FindOptionsWhere<ExamSchedule> = scheduleId
      ? {
          id: Not(scheduleId),
          startDate: LessThan(endDate),
          endDate: MoreThan(startDate),
          exam: { teacher: { id: teacherId } },
        }
      : {
          startDate: LessThan(endDate),
          endDate: MoreThan(startDate),
          exam: { teacher: { id: teacherId } },
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

  getOneById(id: number): Promise<ExamSchedule> {
    return this.repo.findOne({ where: { id } });
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

  async getByDateRangeAndTeacherAndStudentId(
    fromDate: Date,
    toDate: Date,
    teacherId: number,
    studentId: number,
  ) {
    const currentDateTime = dayjs();

    const schedules = await this.repo.find({
      where: {
        startDate: Between(fromDate, toDate),
        students: { id: studentId },
        exam: { status: RecordStatus.Published, teacher: { id: teacherId } },
      },
      relations: { exam: true },
      order: { startDate: 'ASC' },
    });

    const transformedSchedules = schedules.map((s) => {
      const { exam, ...moreSchedule } = s;
      const {
        slug,
        orderNumber,
        title,
        pointsPerQuestion,
        visibleQuestionsCount,
        passingPoints,
        excerpt,
      } = exam;

      return {
        ...moreSchedule,
        exam: {
          slug,
          orderNumber,
          title,
          pointsPerQuestion,
          visibleQuestionsCount,
          passingPoints,
          excerpt,
        },
      };
    });

    const previousSchedules = transformedSchedules.filter((s) =>
      dayjs(s.endDate).isSameOrBefore(currentDateTime),
    );

    const upcomingSchedule = transformedSchedules.filter((s) =>
      dayjs(s.startDate).isAfter(currentDateTime),
    )[0];

    const ongoingSchedules = transformedSchedules.filter(
      (s) =>
        dayjs(s.startDate).isSameOrBefore(currentDateTime) &&
        dayjs(s.endDate).isAfter(currentDateTime),
    );

    if (ongoingSchedules.length) {
      return [...previousSchedules, ...ongoingSchedules];
    } else if (upcomingSchedule) {
      return [...previousSchedules, upcomingSchedule];
    }

    return previousSchedules;
  }

  async create(
    examScheduleDto: ExamScheduleCreateDto,
    teacherId: number,
  ): Promise<ExamSchedule> {
    const { examId, studentIds, ...moreExamScheduleDto } = examScheduleDto;

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

    const examSchedule = this.repo.create({
      ...moreExamScheduleDto,
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
    const { startDate, endDate, studentIds } = examScheduleDto;
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

    return this.repo.save({
      ...examSchedule,
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
