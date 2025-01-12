import {
  objective_questions,
  quiz,
  topics,
  user_quiz_attempts,
} from "../services/prisma";

interface QuizWithObjectiveQuestions extends quiz {
  user_quiz_attempts: user_quiz_attempts[] | null;
  objective_questions: Omit<objective_questions, "correct_answer">[];
}

export interface TopicWithQuizAndObjectiveQuestion extends topics {
  quiz: QuizWithObjectiveQuestions[];
}

export interface QuizzesAssessment extends topics {
  quiz: Omit<QuizWithObjectiveQuestions, "user_quiz_attempts">[];
}

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
