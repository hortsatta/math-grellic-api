import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import dayjs from 'dayjs';

import { UserApprovalStatus } from '../user/enums/user.enum';
import { UserService } from '../user/user.service';
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
            startDate: MoreThanOrEqual(currentDateTime),
            ...studentOverlapBaseWhere,
          },
          {
            endDate: MoreThanOrEqual(currentDateTime),
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

    // Check if schedule date overlaps with existing schedules of other exams by teacher
    const scheduleOverlapBaseWhere: FindOptionsWhere<ExamSchedule> = scheduleId
      ? {
          id: Not(scheduleId),
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
          exam: { teacher: { id: teacherId } },
        }
      : {
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
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

  async create(examScheduleDto: ExamScheduleCreateDto, teacherId: number) {
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
