import {
  quiz,
  objective_questions,
  multiple_choice_options,
} from "@prisma/client";
import { prisma } from "../services/prisma";
import { formatTime } from "../services";

export interface QuizWithObjectiveQuestions extends quiz {
  objective_questions: Omit<objective_questions, "correct_answer">[];
}

export const getChapterWithQuizAndObjectiveQuestion = async (): Promise<
  QuizWithObjectiveQuestions[]
> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.quiz.findMany({
        include: {
          objective_questions: {
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              quiz_id: true,
              question: true,
              question_type: true,
              multiple_choice_options: {
                orderBy: {
                  id: "asc",
                },
              },
            },
          },
        },
      });

      if (result) {
        resolve(result);
      } else {
        reject(new Error("Chapter not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getQuizUserAttempt = async (
  quizId: number,
  userId: number
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.findFirst({
        where: {
          user_id: userId,
          quiz_id: quizId,
        },
      });

      if (result) {
        resolve(result);
      } else {
        reject(new Error("Quiz attempt not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Start initial quiz attempt if user starts quiz
export const initialQuizAttempt = async (
  quizId: number,
  userId: number,
  startedAt: Date
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.create({
        data: {
          quiz_id: quizId,
          user_id: userId,
          start_time: startedAt,
        },
      });

      if (result) {
        resolve();
      } else {
        reject(new Error("Failed to start quiz attempt"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// update to null initial quiz attempt start time if user exits quiz
export const updateInitialQuizAttempt = async (
  quizId: number,
  userId: number
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.update({
        where: {
          user_id: userId,
          AND: {
            quiz_id: quizId,
            start_time: {
              not: null,
            },
          },
        },
        data: {
          start_time: null,
        },
      });

      if (result) {
        resolve();
      } else {
        reject(new Error("Failed to update quiz attempt"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Submit quiz attempt
export const submitQuizAttempt = async (
  attemptId: number,
  quizId: number,
  userId: number,
  time: {
    startedAt: Date;
    completedAt: Date;
  },
  assessmentData: { [quizID: string]: string }
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resultTransaction = await prisma.$transaction([
        ...Object.entries(assessmentData).map(([questionId, answer]) =>
          prisma.user_identification_answers.create({
            data: {
              user_id: userId,
              question_id: parseInt(questionId),
              user_answer: answer,
              attempt_id: attemptId, // Using userQuizAttemptUpdate result
            },
          })
        ),

        prisma.user_quiz_attempts.update({
          where: {
            user_id: userId,
            AND: {
              quiz_id: quizId,
              start_time: {
                not: null,
              },
            },
          },
          data: {
            time_taken: formatTime(
              time.startedAt.getTime() - time.completedAt.getTime()
            ),
          },
        }),
      ]);

      if (resultTransaction) {
        resolve(resultTransaction);
      } else {
        reject(new Error("Failed to submit quiz attempt"));
      }
    } catch (error) {
      reject(error);
    }
  });
};
