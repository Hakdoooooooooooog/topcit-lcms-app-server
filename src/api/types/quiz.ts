import {
  objective_questions,
  quiz,
  topics,
  user_quiz_attempts,
} from "../services/prisma";

interface QuizWithObjectiveQuestions extends quiz {
  _count: {
    user_quiz_attempts: number;
    objective_questions: number;
  };
  objective_questions: Omit<objective_questions, "correct_answer">[];
}

export interface TopicWithQuiz extends topics {
  quiz: quiz[];
}

export interface TopicQuizAssessments {
  objective_questions: objective_questions[];
}

export interface QuizzesAssessment extends topics {
  chapters: {
    id: bigint;
    topic_id: bigint;
    title: string;
  }[];
  quiz: Omit<QuizWithObjectiveQuestions, "_count">[];
}

export type QuizDetails = {
  topics: {
    topicId: number;
  };
  quizId?: number;
  chapterSelect?: string;
  chapterId?: number;
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

export interface QuizAssessmentScores
  extends Pick<topics, "id" | "topictitle"> {
  quiz: {
    id: bigint;
    title: string;
    max_attempts: number | null;
    user_quiz_attempts: Omit<
      user_quiz_attempts,
      "student_id" | "id" | "completed_at" | "start_time"
    >[];
  }[];
}
