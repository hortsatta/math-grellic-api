export type ExamAnswer = {
  questionId: number;
  selectedChoiceId?: number;
};

export type ExamStudent = {
  studentId: number;
  answers: ExamAnswer[];
};

export type ExamRoom = {
  name: string;
  examId: number;
  endDate: Date;
  interval: NodeJS.Timeout;
  students: ExamStudent[];
};
