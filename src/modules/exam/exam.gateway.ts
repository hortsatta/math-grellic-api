import { NotFoundException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';

import dayjs from '#/common/configs/dayjs.config';
import { RecordStatus } from '#/common/enums/content.enum';
import { Exam } from './entities/exam.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ExamCompletion } from './entities/exam-completion.entity';
import { ExamAnswer, ExamRoom } from './models/exam.model';

@WebSocketGateway()
export class ExamGateway {
  @WebSocketServer() server: Server;
  private rooms: ExamRoom[] = [];

  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamCompletion)
    private readonly examCompletionRepo: Repository<ExamCompletion>,
  ) {}

  private async saveStudentsCompletion(room: ExamRoom) {
    const { examId, students } = room;
    const currentDateTime = dayjs();

    const exam = await this.examRepo.findOne({
      where: { id: examId, status: RecordStatus.Published },
    });

    const examQuestions = await this.examQuestionRepo.find({
      where: { exam: { id: examId } },
      relations: { choices: true },
    });

    await Promise.all(
      students.map(async ({ studentId, answers }) => {
        const correctCount = answers.reduce(
          (acc, { questionId, selectedChoiceId }) => {
            if (!questionId || !selectedChoiceId) {
              return acc;
            }

            const question = examQuestions.find((q) => q.id === questionId);
            const choice = question
              ? question.choices.find((c) => c.id === selectedChoiceId)
              : null;

            return choice.isCorrect ? acc + 1 : acc;
          },
          0,
        );

        const score = correctCount * exam.pointsPerQuestion;

        const newQuestionAnswers = answers.map(
          ({ questionId, selectedChoiceId }) => ({
            question: { id: questionId },
            selectedQuestionChoice: selectedChoiceId
              ? { id: selectedChoiceId }
              : null,
          }),
        );

        const completion = this.examCompletionRepo.create({
          score,
          submittedAt: currentDateTime,
          exam,
          questionAnswers: newQuestionAnswers,
          student: { id: studentId },
        });

        await this.examCompletionRepo.save(completion);
      }),
    );
  }

  private removeRoom(targetRoomName: string) {
    const expiredRoomIndex = this.rooms.findIndex(
      (r) => r.name === targetRoomName,
    );

    if (expiredRoomIndex < 0) {
      return;
    }

    // Clear room interval (stop exam timer)
    expiredRoomIndex >= 0 &&
      clearInterval(this.rooms[expiredRoomIndex].interval);

    // Delete expired room after 5 minutes (300000)
    // but check for remaining students first (not yet submitted exam form after 5 mins)
    // and save exam form (exam completion)
    setTimeout(async () => {
      await this.saveStudentsCompletion(this.rooms[expiredRoomIndex]);
      this.rooms.splice(expiredRoomIndex, 1);
      // Delete websocket room
      const sockets = await this.server.in(targetRoomName).fetchSockets();
      sockets.forEach((socket) => {
        socket.leave(targetRoomName);
      });
    }, 300000);
  }

  @SubscribeMessage('exam-take')
  async takeExam(
    @MessageBody()
    data: { slug: string; questions: ExamQuestion[]; studentId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { slug, questions, studentId } = data;

    // Get exam by slug with schedules and completions
    // Throw error if exam not found
    const exam = await this.examRepo.findOne({
      where: [
        {
          slug,
          status: RecordStatus.Published,
          schedules: { students: { id: studentId } },
        },
      ],
      relations: {
        coveredLessons: true,
        questions: { choices: true },
        schedules: { students: true },
        completions: { questionAnswers: true, student: true },
      },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Filter exam completions that belong to current student only
    exam.completions = exam.completions.filter(
      (com) => com.student.id === studentId,
    );

    // Check if exam is ongoing, if false then return null
    // Student should only take ongoing exams
    const isOngoing = exam.schedules.some((schedule) => {
      const startDate = dayjs(schedule.startDate);
      const endDate = dayjs(schedule.endDate);
      return dayjs().isBetween(startDate, endDate, null, '[]');
    });

    if (!isOngoing || exam.completions.length) {
      return null;
    }

    // Create room name base on exam id and schedule id
    const roomName = `exam-${exam.id}-${exam.schedules[0].id}`;
    // Let student join socket room, automatically creates room if nonexistent
    client.join(roomName);

    // Check if room already exists, if false then push new room with current student,
    // And with questions with no selected choice (in order) as answers
    const roomIndex = this.rooms.findIndex((r) => r.name === roomName);
    if (roomIndex < 0) {
      const endDate = exam.schedules[0].endDate;

      const countdownSeconds = () => {
        const targetDayJs = dayjs(endDate);
        const sourceDayJs = dayjs();
        const duration = dayjs.duration(
          Math.max(0, targetDayJs.diff(sourceDayJs) || 0),
        );
        const countdownSeconds = Math.floor(duration.asSeconds());

        // If end date and time is reached then clear interval and the room itself
        if (countdownSeconds <= 0) {
          this.server.to(roomName).emit('exam-take-expired', countdownSeconds);
          this.removeRoom(roomName);
        }

        this.server.to(roomName).emit('exam-tick', countdownSeconds);
      };

      const students = [
        {
          studentId,
          answers: questions.map((q) => ({ questionId: q.id })),
        },
      ];

      this.rooms.push({
        name: roomName,
        examId: exam.id,
        endDate: exam.schedules[0].endDate,
        interval: setInterval(countdownSeconds, 1000),
        students,
      });

      return { roomName, answers: [] };
    } else {
      // If room is existing then get if current student has joined room before,
      // If true then just return student answers, else push new student with questions same as above
      const student = this.rooms[roomIndex].students.find(
        (s) => s.studentId === studentId,
      );

      if (!student) {
        const newStudent = {
          studentId,
          answers: questions.map((q) => ({ questionId: q.id })),
        };

        this.rooms[roomIndex].students.push(newStudent);

        return { roomName, answers: [] };
      }

      return { roomName, answers: student.answers };
    }
  }

  @SubscribeMessage('exam-sync-answers')
  async syncAnswers(
    @MessageBody()
    data: {
      roomName: string;
      answers: ExamAnswer[];
      studentId: number;
    },
  ) {
    const { roomName, answers, studentId } = data;
    // Get room index using room name
    const roomIndex = this.rooms.findIndex((r) => r.name === roomName);
    // Return false if room does not exist
    if (roomIndex < 0) {
      return false;
    }
    // Get student index using student id and room index
    const studentIndex = this.rooms[roomIndex].students.findIndex(
      (s) => s.studentId === studentId,
    );
    // Return false if student does not exist
    if (studentIndex < 0) {
      return false;
    }

    // Sync target student answers with updated data
    this.rooms[roomIndex].students[studentIndex].answers = answers.filter(
      (a) => !!a,
    );
    return true;
  }

  @SubscribeMessage('exam-take-done')
  async takeExamDone(
    @MessageBody() data: { roomName: string; studentId: number },
  ) {
    const { roomName, studentId } = data;
    // Get room index using room name
    const roomIndex = this.rooms.findIndex((r) => r.name === roomName);
    // Return false if room does not exist
    if (roomIndex < 0) {
      return false;
    }
    // Get student index using student id and room index
    const studentIndex = this.rooms[roomIndex].students.findIndex(
      (s) => s.studentId === studentId,
    );
    // Return false if student does not exist
    if (studentIndex < 0) {
      return false;
    }

    // Remove student from target room using room index and student index
    this.rooms[roomIndex].students.splice(studentIndex, 1);
    return true;
  }
}
