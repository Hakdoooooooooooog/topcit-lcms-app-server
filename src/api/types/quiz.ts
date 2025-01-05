export type QuizDetails = {
  topics: {
    topicId: number;
  };
  quizId?: number;
  title: string;
  quizType?: string | null;
  maxAttempts: number;
  objectiveQuestions: {
    quizId: string;
    question: string;
    questionType: string;
    correctAnswer: string;
    multipleChoiceOptions: {
      optionText: string;
    }[];
  }[];
};
