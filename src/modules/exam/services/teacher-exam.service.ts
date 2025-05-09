import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  In,
  FindOptionsOrder,
  FindOptionsOrderValue,
  Repository,
  IsNull,
  LessThanOrEqual,
  Not,
} from 'typeorm';

import dayjs from '#/common/configs/dayjs.config';
import { DEFAULT_TAKE } from '#/common/helpers/pagination.helper';
import { RecordStatus } from '#/common/enums/content.enum';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { SchoolYearEnrollmentApprovalStatus } from '#/modules/school-year/enums/school-year-enrollment.enum';
import { UploadService } from '#/modules/upload/upload.service';
import { SchoolYearService } from '#/modules/school-year/services/school-year.service';
import { TeacherLessonService } from '#/modules/lesson/services/teacher-lesson.service';
import { StudentUserService } from '#/modules/user/services/student-user.service';
import { stripHtml } from '../helpers/exam.helper';
import { ExamResponse } from '../models/exam.model';
import { Exam } from '../entities/exam.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamQuestionChoice } from '../entities/exam-question-choice.entity';
import { ExamCompletion } from '../entities/exam-completion.entity';
import { ExamCreateDto } from '../dtos/exam-create.dto';
import { ExamUpdateDto } from '../dtos/exam-update.dto';
import { TeacherExamScheduleService } from './teacher-exam-schedule.service';
import { ExamQuestionCreateDto } from '../dtos/exam-question-create.dto';
import { ExamQuestionUpdateDto } from '../dtos/exam-question-update.dto';
import { ExamScheduleCreateDto } from '../dtos/exam-schedule-create.dto';
import { ExamScheduleUpdateDto } from '../dtos/exam-schedule-update.dto';

@Injectable()
export class TeacherExamService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamQuestionChoice)
    private readonly examQuestionChoiceRepo: Repository<ExamQuestionChoice>,
    @InjectRepository(ExamCompletion)
    private readonly examCompletionRepo: Repository<ExamCompletion>,
    @Inject(TeacherExamScheduleService)
    private readonly teacherExamScheduleService: TeacherExamScheduleService,
    @Inject(TeacherLessonService)
    private readonly teacherLessonService: TeacherLessonService,
    @Inject(StudentUserService)
    private readonly studentUserService: StudentUserService,
    @Inject(UploadService)
    private readonly uploadService: UploadService,
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
    private configService: ConfigService,
  ) {}

  async validateUpsertExamSchedule(
    startDate: Date,
    endDate: Date,
    studentIds: number[],
    teacherId: number,
    schoolYearId: number,
    scheduleTitle?: string,
  ) {
    if (!scheduleTitle?.trim().length) {
      throw new BadRequestException('Schedule title is invalid');
    }

    const { error: scheduleError } =
      await this.teacherExamScheduleService.validateScheduleUpsert(
        startDate,
        endDate,
        teacherId,
        schoolYearId,
        studentIds,
      );

    if (scheduleError) {
      throw scheduleError;
    }
  }

  async validateCreateExam(examDto: ExamCreateDto, teacherId: number) {
    const {
      status,
      coveredLessonIds,
      questions,
      scheduleTitle,
      startDate,
      endDate,
      studentIds,
      schoolYearId,
      ...moreExamDto
    } = examDto;

    // Check if passing points is more than the exam's total points
    if (
      moreExamDto.passingPoints >
      moreExamDto.pointsPerQuestion * moreExamDto.visibleQuestionsCount
    ) {
      throw new BadRequestException('Passing points is more that total points');
    }

    // Validate exam order number if unique for current teacher user
    const orderNumberCount = await this.examRepo.count({
      where: {
        orderNumber: moreExamDto.orderNumber,
        teacher: { id: teacherId },
        schoolYear: { id: schoolYearId },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Exam number is already present');
    }

    this.validateExamQuestion(questions);

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons =
        await this.teacherLessonService.getTeacherLessonsByTeacherId(
          teacherId,
          undefined,
          coveredLessonIds,
          undefined,
          RecordStatus.Published,
          schoolYearId,
          true,
        );
      if (lessons.length !== coveredLessonIds.length) {
        throw new BadRequestException('Covered lessons is invalid');
      }
    }

    if (!startDate || status !== RecordStatus.Published) return;

    // FOR SCHEDULE, check before creating exam to avoid conflicts
    // If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    await this.validateUpsertExamSchedule(
      startDate,
      endDate,
      studentIds,
      teacherId,
      schoolYearId,
      scheduleTitle,
    );
  }

  async validateUpdateExam(
    examDto: ExamUpdateDto,
    id: number,
    exam: Exam,
    teacherId: number,
  ) {
    const {
      status,
      coveredLessonIds,
      questions,
      scheduleTitle,
      startDate,
      endDate,
      studentIds,
      ...moreExamDto
    } = examDto;

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const { schoolYear } = exam;

    // Check if passing points is more than the exam's total points
    if (
      moreExamDto.passingPoints >
      moreExamDto.pointsPerQuestion * moreExamDto.visibleQuestionsCount
    ) {
      throw new BadRequestException('Passing points is more that total points');
    }

    // Check if someone has already completed exam, if true then cancel update
    const completionCount = await this.examCompletionRepo.count({
      where: { exam: { id: exam.id } },
    });

    if (completionCount > 0) {
      throw new BadRequestException(
        'Cannot update exams that are already taken',
      );
    }

    // Validate exam order number if unique for current teacher user
    // Except order number of target exam
    const orderNumberCount = await this.examRepo.count({
      where: {
        orderNumber: moreExamDto.orderNumber,
        id: Not(id),
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      },
    });
    if (!!orderNumberCount) {
      throw new ConflictException('Exam number is already present');
    }

    this.validateExamQuestion(questions);

    // Validate if lessons from coveredLessonIds is owned by current user teacher
    if (coveredLessonIds?.length) {
      const lessons =
        await this.teacherLessonService.getTeacherLessonsByTeacherId(
          teacherId,
          undefined,
          coveredLessonIds,
          undefined,
          RecordStatus.Published,
          schoolYear.id,
          true,
        );
      if (lessons.length !== coveredLessonIds.length) {
        throw new BadRequestException('Covered lessons is invalid');
      }
    }

    // Prevent updating exam from published to draft if schedules or completions are present
    if (
      exam.status === RecordStatus.Published &&
      status === RecordStatus.Draft &&
      (exam.schedules.length || exam.completions.length)
    ) {
      throw new BadRequestException(
        'Exam has schedules or already taken by students',
      );
    }

    if (!startDate || status !== RecordStatus.Published) return;

    await this.validateUpsertExamSchedule(
      startDate,
      endDate,
      studentIds,
      teacherId,
      schoolYear.id,
      scheduleTitle,
    );
  }

  validateExamQuestion(
    questions: ExamQuestionCreateDto[] | ExamQuestionUpdateDto[],
  ) {
    questions.forEach((question: any) => {
      stripHtml(
        question.text,
        () => {
          throw new BadRequestException('Question is invalid');
        },
        () => {
          throw new BadRequestException('An image from a question is invalid');
        },
      );

      // Check if choice text field are not empty by trimming and stripping html
      question.choices.forEach((choice: any) => {
        stripHtml(
          choice.text,
          () => {
            throw new BadRequestException('Choice is invalid');
          },
          () => {
            throw new BadRequestException('An image from a choice is invalid');
          },
        );
      });

      // Check if all questions have atleast one isCorrect choice
      const hasCorrectChoice = question.choices.some(
        (choice: any) => choice.isCorrect,
      );

      if (!hasCorrectChoice) {
        throw new BadRequestException(
          'Question should have an answer from the choices',
        );
      }
    });
  }

  async validateUpsert(
    examDto: ExamCreateDto | ExamUpdateDto,
    teacherId: number,
    id?: number,
  ) {
    if (!id) {
      const { schoolYearId } = examDto as ExamCreateDto;

      // Get target SY or if undefined, then get current SY
      const schoolYear =
        schoolYearId != null
          ? await this.schoolYearService.getOneById(schoolYearId)
          : await this.schoolYearService.getCurrentSchoolYear();

      if (!schoolYear) {
        throw new BadRequestException('Invalid school year');
      }

      return this.validateCreateExam(
        { ...examDto, schoolYearId: schoolYear.id } as ExamCreateDto,
        teacherId,
      );
    }

    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: { id, teacher: { id: teacherId } },
      relations: {
        questions: { choices: true },
        schedules: true,
        completions: true,
        schoolYear: true,
      },
    });

    if (!exam) {
      throw new BadRequestException('Exam not found');
    }

    return this.validateUpdateExam(
      examDto as ExamUpdateDto,
      id,
      exam,
      teacherId,
    );
  }

  async getPaginationTeacherExamsByTeacherId(
    teacherId: number,
    sort: string,
    take: number = DEFAULT_TAKE,
    skip: number = 0,
    q?: string,
    status?: string,
    schoolYearId?: number,
  ): Promise<[Exam[], number]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const currentDateTime = dayjs().toDate();

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      };

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<Exam> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (sortBy === 'scheduleDate') {
        return { schedules: { startDate: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    const [exams, examCount] = await this.examRepo.findAndCount({
      where: generateWhere(),
      relations: { schedules: true },
      order: generateOrder(),
      skip,
      take,
    });

    const transformedExams = exams.map((exam) => {
      const schedules = exam.schedules
        .sort(
          (schedA, schedB) =>
            dayjs(schedB.startDate).valueOf() -
            dayjs(schedA.startDate).valueOf(),
        )
        .map((schedule) => {
          const scheduleStatus = {
            isUpcoming: undefined,
            isOngoing: undefined,
          };

          if (
            dayjs(schedule.startDate).isSameOrBefore(currentDateTime) &&
            dayjs(schedule.endDate).isAfter(currentDateTime)
          ) {
            scheduleStatus.isOngoing = true;
          } else if (dayjs(schedule.startDate).isAfter(currentDateTime)) {
            scheduleStatus.isUpcoming = true;
          }

          return { ...schedule, ...scheduleStatus };
        });

      return { ...exam, schedules };
    });

    return [transformedExams, examCount];
  }

  getTeacherExamsByTeacherId(
    teacherId: number,
    schoolYearId: number,
    sort?: string,
    examIds?: number[],
    q?: string,
    status?: string,
    withSchedules?: boolean,
    withCompletions?: boolean,
  ) {
    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYearId },
      };

      if (examIds?.length) {
        baseWhere = { ...baseWhere, id: In(examIds) };
      }

      if (q?.trim()) {
        baseWhere = { ...baseWhere, title: ILike(`%${q}%`) };
      }

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const generateOrder = (): FindOptionsOrder<Exam> => {
      if (!sort) {
        return { orderNumber: 'ASC' };
      }

      const [sortBy, sortOrder] = sort?.split(',') || [];

      if (sortBy === 'scheduleDate') {
        return { schedules: { startDate: sortOrder as FindOptionsOrderValue } };
      }

      return { [sortBy]: sortOrder };
    };

    return this.examRepo.find({
      where: generateWhere(),
      order: generateOrder(),
      relations: { schedules: withSchedules, completions: withCompletions },
    });
  }

  async getExamSnippetsByTeacherId(
    teacherId: number,
    take = 3,
    schoolYearId?: number,
  ): Promise<Exam[]> {
    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const exams = await this.examRepo.find({
      where: {
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      },
      relations: { schedules: true },
    });

    const publishedExamsWithoutSchedule = exams.filter(
      (exam) =>
        !exam.schedules.length && exam.status === RecordStatus.Published,
    );

    const draftExams = exams.filter(
      (exam) => exam.status === RecordStatus.Draft,
    );

    if (publishedExamsWithoutSchedule.length + draftExams.length >= take) {
      return [...publishedExamsWithoutSchedule, ...draftExams].slice(0, take);
    }

    const publishedExamsWithSchedule = exams.filter(
      (exam) =>
        !!exam.schedules.length && exam.status === RecordStatus.Published,
    );

    const targetExams = [
      ...publishedExamsWithoutSchedule,
      ...draftExams,
      ...publishedExamsWithSchedule,
    ];

    const lastIndex = !!targetExams.length
      ? targetExams.length > take
        ? take
        : targetExams.length
      : 0;

    return targetExams.slice(0, lastIndex);
  }

  async getExamsWithCompletionsByStudentIdAndTeacherId(
    studentId: number,
    teacherId: number,
    schoolYearId: number,
    isStudent?: boolean,
  ): Promise<Partial<ExamResponse>[]> {
    const currentDateTime = dayjs();

    const generateWhere = () => {
      const baseWhere: FindOptionsWhere<Exam> = {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schoolYear: { id: schoolYearId },
      };

      if (isStudent) {
        return {
          ...baseWhere,
          schedules: {
            startDate: LessThanOrEqual(dayjs().toDate()),
            students: { id: studentId },
          },
        };
      }

      return {
        ...baseWhere,
        schedules: {
          startDate: Not(IsNull()),
          students: { id: studentId },
        },
      };
    };

    const exams: Partial<ExamResponse>[] = await this.examRepo.find({
      where: generateWhere(),
      relations: {
        completions: { student: true, schedule: true },
        schedules: { students: true },
      },
      order: { orderNumber: 'ASC' },
    });

    const transformedExams = exams.map((exam) => {
      const completions = exam.completions.filter(
        (completion) => completion.student.id === studentId,
      );

      const schedules = exam.schedules
        .filter((schedule) =>
          schedule.students?.some((student) => student.id === studentId),
        )
        .sort(
          (scheduleA, scheduleB) =>
            scheduleB.startDate.valueOf() - scheduleA.startDate.valueOf(),
        );

      const highestCompletion = completions.reduce((acc, com) => {
        if (acc == null) return com;
        return com.score > acc.score ? com : acc;
      }, null);

      const recentSchedule =
        schedules.filter((schedule) =>
          dayjs(schedule.startDate).isSameOrBefore(currentDateTime),
        )[0] || null;

      const upcomingSchedules = schedules.filter((schedule) =>
        dayjs(schedule.startDate).isAfter(currentDateTime),
      );

      const ongoingSchedules = schedules.filter(
        (schedule) =>
          dayjs(schedule.startDate).isSameOrBefore(currentDateTime) &&
          dayjs(schedule.endDate).isAfter(currentDateTime),
      );

      // Apply isRecent, isUpcoming, and isOngoing on schedules
      schedules.forEach((schedule) => {
        if (schedule.id === recentSchedule.id) schedule.isRecent = true;

        if (
          upcomingSchedules.some(
            (upcomingSched) => upcomingSched.id === schedule.id,
          )
        ) {
          schedule.isUpcoming = true;
        } else if (
          ongoingSchedules.some(
            (ongoingSched) => ongoingSched.id === schedule.id,
          )
        ) {
          schedule.isOngoing = true;
        }
      });

      // Apply isHighest and isRecent on completions
      completions.forEach((com) => {
        if (com.id === highestCompletion.id) com.isHighest = true;
        if (com.schedule.id === recentSchedule.id) com.isRecent = true;
      });

      return {
        ...exam,
        completions,
        schedules,
      };
    });

    return transformedExams;
  }

  async getOneBySlugAndTeacherId(
    slug: string,
    teacherId: number,
    status?: string,
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

    const generateWhere = () => {
      let baseWhere: FindOptionsWhere<Exam> = {
        slug,
        teacher: { id: teacherId },
        schoolYear: { id: schoolYear.id },
      };

      if (status?.trim()) {
        baseWhere = { ...baseWhere, status: In(status.split(',')) };
      }

      return baseWhere;
    };

    const exam = await this.examRepo.findOne({
      where: generateWhere(),
      relations: {
        coveredLessons: true,
        questions: { choices: true },
        schedules: { students: true },
      },
      order: {
        questions: { orderNumber: 'ASC', choices: { orderNumber: 'ASC' } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const totalStudentCount = (
      await this.studentUserService.getStudentsByTeacherId(
        teacherId,
        undefined,
        undefined,
        UserApprovalStatus.Approved,
        schoolYear.id,
        SchoolYearEnrollmentApprovalStatus.Approved,
      )
    ).length;
    // Generate schedule assigned student count over total student count
    if (exam.schedules.length) {
      exam.schedules = exam.schedules.map((schedule) => {
        const studentCount = `${schedule.students.length}/${totalStudentCount}`;
        return { ...schedule, studentCount };
      });
    }

    return exam;
  }

  async create(examDto: ExamCreateDto, teacherId: number): Promise<Exam> {
    const {
      scheduleTitle,
      startDate,
      endDate,
      studentIds,
      coveredLessonIds,
      questions,
      schoolYearId,
      ...moreExamDto
    } = examDto;

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    await this.validateCreateExam(
      { ...examDto, schoolYearId: schoolYear.id },
      teacherId,
    );

    // Create covered lessons object
    const coveredLessons = coveredLessonIds
      ? coveredLessonIds.map((lessonId) => ({ id: lessonId }))
      : [];
    // Create exam entity and save it
    const exam = this.examRepo.create({
      ...moreExamDto,
      coveredLessons,
      questions,
      teacher: { id: teacherId },
      schoolYear: { id: schoolYear.id },
    });
    const { id } = await this.examRepo.save(exam);

    // Manually query newly created exam since relations aren't returned on exam creation
    const newExam = await this.examRepo.findOne({
      where: { id },
      relations: {
        coveredLessons: true,
        questions: { choices: true },
      },
    });

    // If exam has incomplete field for schedule or is draft then dont save schedule
    if (!startDate || newExam.status !== RecordStatus.Published) {
      return newExam;
    }

    // FOR SCHEDULE
    // If startDate is present then create schedule, convert from instance to plain
    // and return it with new exam
    const schedule = await this.teacherExamScheduleService.create(
      {
        title: scheduleTitle,
        startDate,
        endDate,
        examId: newExam.id,
        studentIds,
      },
      teacherId,
    );

    return { ...newExam, schedules: [schedule] };
  }

  async update(
    id: number,
    examDto: ExamUpdateDto,
    teacherId: number,
    strict?: boolean,
    publicId?: string,
  ): Promise<Exam> {
    const {
      coveredLessonIds,
      questions,
      scheduleTitle,
      startDate,
      endDate,
      studentIds,
      ...moreExamDto
    } = examDto;

    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: {
        id,
        teacher: { id: teacherId },
      },
      relations: {
        questions: { choices: true },
        schedules: true,
        completions: true,
        schoolYear: true,
      },
    });

    await this.validateUpdateExam(examDto, id, exam, teacherId);

    if (strict && publicId.trim().length) {
      // Define base path and delete exam images if exists
      const basePath = `${this.configService.get<string>(
        'SUPABASE_BASE_FOLDER_NAME',
      )}/${publicId.toLowerCase()}/exams/e${exam.orderNumber}_${exam.schoolYear.id}`;

      await this.uploadService.deleteFolderRecursively(basePath);
    }

    const coveredLessons = coveredLessonIds
      ? coveredLessonIds.map((lessonId) => ({ id: lessonId }))
      : [];

    // Delete questions and choices not included in request
    await this.deleteExamQuestionsAndChoices(questions, exam);

    // Update exam, ignore schedule if previous exam status is published
    const updatedExam = await this.examRepo.save({
      ...exam,
      ...moreExamDto,
      coveredLessons,
      questions,
    });

    // If exam has incomplete field for schedule or is draft then dont save schedule
    if (!startDate || updatedExam.status !== RecordStatus.Published) {
      return updatedExam;
    }

    const schedule = await this.teacherExamScheduleService.create(
      {
        title: scheduleTitle,
        startDate,
        endDate,
        examId: updatedExam.id,
        studentIds,
      },
      teacherId,
    );

    return { ...updatedExam, schedules: [schedule] };
  }

  async delete(
    id: number,
    teacherId: number,
    publicId: string,
  ): Promise<boolean> {
    // Find exam, throw error if none found
    const exam = await this.examRepo.findOne({
      where: { id, teacher: { id: teacherId } },
      relations: { schoolYear: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Abort if exam had completions
    const hasCompletion = !!(await this.examCompletionRepo.count({
      where: { exam: { id: exam.id } },
    }));
    if (hasCompletion) {
      throw new BadRequestException('Cannot delete exam');
    }

    // Define base path and delete exam images if exists
    const basePath = `${this.configService.get<string>(
      'SUPABASE_BASE_FOLDER_NAME',
    )}/${publicId.toLowerCase()}/exams/e${exam.orderNumber}_${exam.schoolYear.id}`;

    await this.uploadService.deleteFolderRecursively(basePath);

    const result = await this.examRepo.delete({ id });
    return !!result.affected;
  }

  async deleteExamQuestionsAndChoices(
    questions: ExamQuestionUpdateDto[],
    exam: Exam,
  ) {
    const targetQuestionIds = questions.filter((q) => !!q.id).map((q) => q.id);

    // Delete questions not included in update
    const questionsToDelete = exam.questions.filter(
      (q) => !targetQuestionIds.includes(q.id),
    );
    await this.examQuestionRepo.remove(questionsToDelete);

    // Delete choices not included in update
    await Promise.all(
      questions
        .filter((q) => !!q.id)
        .map(async (targetQuestion) => {
          const currentQuestion = exam.questions.find(
            (q) => q.id === targetQuestion.id,
          );

          const targetChoiceIds = targetQuestion.choices
            .filter((c) => !!c.id)
            .map((c) => c.id);

          // Delete questions not included in update
          const choicesToDelete = currentQuestion.choices.filter(
            (c) => !targetChoiceIds.includes(c.id),
          );
          await this.examQuestionChoiceRepo.remove(choicesToDelete);
        }),
    );
  }

  async createSchedule(
    examScheduleDto: ExamScheduleCreateDto,
    teacherId: number,
  ) {
    const { examId, startDate, endDate, studentIds } = examScheduleDto;

    const exam = await this.examRepo.findOne({
      where: {
        id: examId,
        status: RecordStatus.Published,
        teacher: { id: teacherId },
      },
      relations: { schoolYear: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const { schoolYear } = exam;

    // check before creating exam to avoid conflicts, If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    const { error } =
      await this.teacherExamScheduleService.validateScheduleUpsert(
        startDate,
        endDate,
        teacherId,
        schoolYear.id,
        studentIds,
        examId,
      );

    if (error) {
      throw error;
    }

    return this.teacherExamScheduleService.create(examScheduleDto, teacherId);
  }

  async updateSchedule(
    scheduleId: number,
    examScheduleDto: ExamScheduleUpdateDto,
    teacherId: number,
  ) {
    const { startDate, endDate, studentIds } = examScheduleDto;

    const exam = await this.examRepo.findOne({
      where: {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schedules: { id: scheduleId },
      },
      relations: { schoolYear: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam schedule not found');
    }

    const { schoolYear } = exam;

    // Check before creating exam to avoid conflicts, If schedule is present then validate students
    // Check start date and end date if no conflicts with other schedules/exams
    const { error } =
      await this.teacherExamScheduleService.validateScheduleUpsert(
        startDate,
        endDate,
        teacherId,
        schoolYear.id,
        studentIds,
        exam.id,
        scheduleId,
      );

    if (error) {
      throw error;
    }

    return await this.teacherExamScheduleService.update(
      scheduleId,
      examScheduleDto,
      teacherId,
    );
  }

  async deleteSchedule(
    scheduleId: number,
    teacherId: number,
  ): Promise<boolean> {
    // TODO soft delete if schedule has completion
    // Check if lesson has complete, if true then cancel deletion
    const exam = await this.examRepo.findOne({
      where: {
        status: RecordStatus.Published,
        teacher: { id: teacherId },
        schedules: { id: scheduleId },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam schedule not found');
    }

    return this.teacherExamScheduleService.delete(scheduleId);
  }
}
