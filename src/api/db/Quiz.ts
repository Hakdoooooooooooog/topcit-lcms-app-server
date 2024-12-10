import {
  prisma,
  objective_questions,
  quiz,
  user_quiz_attempts,
} from "../services/prisma";

export interface QuizWithObjectiveQuestions extends quiz {
  objective_questions: Omit<objective_questions, "correct_answer">[];
}

export const getChapterWithQuizAndObjectiveQuestion = async (
  userId: number
): Promise<QuizWithObjectiveQuestions[]> => {
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

          user_quiz_attempts: {
            where: {
              user_id: userId,
            },
            select: {
              quiz_id: true,
              start_time: true,
              score: true,
              completed_at: true,
              timeTaken: true,
              attempt_count: true,
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
): Promise<Error | user_quiz_attempts> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.findUnique({
        where: {
          user_id: userId,
          AND: {
            quiz_id: quizId,
          },
        },
      });

      if (result) {
        resolve(result);
      } else {
        reject(new Error("Quiz attempt not found"));
      }
    } catch (error: any) {
      reject(error);
    }
  });
};

// Start initial quiz attempt if user starts quiz
export const initialQuizAttempt = async (
  quizId: number,
  userId: number,
  startedAt: Date
): Promise<Error | { message: string }> => {
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
        resolve({ message: "Quiz attempt started successfully" });
      } else {
        reject(new Error("Failed to start quiz attempt"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// update initial quiz attempt if user starts quiz and have existing attempt
export const updateExistingInitialQuizAttempt = async (
  attemptId: number,
  quizId: number,
  userId: number,
  startedAt: Date
): Promise<Error | { message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.update({
        where: {
          id: attemptId,
          AND: {
            quiz_id: quizId,
            user_id: userId,
          },
        },
        data: {
          start_time: startedAt,
        },
      });

      if (result) {
        resolve({ message: "Quiz forfeited successfully" });
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
  quizId: number,
  userId: number,
  quizUserObjectiveAnswers: { question_id: number; user_answer: string }[]
): Promise<Error | { message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resultTransaction = await prisma.$transaction(async (tx) => {
        // Get user quiz attempt
        const userQuizAttempt = await tx.user_quiz_attempts.findFirst({
          where: {
            user_id: userId,
            quiz_id: quizId,
            start_time: {
              not: null,
            },
          },
        });

        if (!userQuizAttempt) {
          throw new Error("Quiz attempt not found");
        }

        const getMultipleChoiceId = await tx.multiple_choice_options.findMany({
          where: {
            objective_question_id: {
              in: quizUserObjectiveAnswers.map((answer) => answer.question_id),
            },
            AND: {
              option_text: {
                in: quizUserObjectiveAnswers.map(
                  (answer) => answer.user_answer
                ),
              },
            },
          },
          select: {
            id: true,
            objective_question_id: true,
            option_text: true,
          },
        });

        if (!getMultipleChoiceId) {
          throw new Error("Multiple choice options not found");
        }

        const createUserMultipleChoiceAnswers =
          await tx.user_multiple_choice_answers.createMany({
            data: quizUserObjectiveAnswers.map((answer) => {
              return {
                attempt_id: userQuizAttempt.id,
                user_id: userId,
                question_id: answer.question_id,
                user_selected_option_id: getMultipleChoiceId.find(
                  (option) =>
                    option.option_text === answer.user_answer &&
                    Number(option.objective_question_id) === answer.question_id
                )?.id,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              };
            }),
          });

        if (!createUserMultipleChoiceAnswers) {
          throw new Error("Failed to update user multiple choice answers");
        }

        const getUserMultipleChoiceAnswer =
          await tx.user_multiple_choice_answers.findMany({
            where: {
              attempt_id: userQuizAttempt.id,
              AND: {
                user_id: userId,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              },
            },

            select: {
              user_selected_option_id: true,
            },
          });

        if (!getUserMultipleChoiceAnswer) {
          throw new Error("User multiple choice answers not found");
        }

        const getMultipleChoiceCorrectAnswer =
          await tx.objective_questions.findMany({
            where: {
              quiz_id: quizId,
              question_type: "multiple_choice",
            },
            select: {
              id: true,
              correct_answer: true,
            },
          });

        if (!getMultipleChoiceCorrectAnswer) {
          throw new Error("Multiple choice correct answers not found");
        }

        const getUserAnswer = await tx.multiple_choice_options.findMany({
          where: {
            id: {
              in: getUserMultipleChoiceAnswer
                .filter((answer) => answer.user_selected_option_id !== null)
                .map((answer) => answer.user_selected_option_id as bigint),
            },
          },
          select: {
            id: true,
            option_text: true,
          },
        });

        if (!getUserAnswer) {
          throw new Error("User answers not found");
        }

        // Update User multiple choice answers if correct
        const updateUserMultipleChoiceAnswers =
          await tx.user_multiple_choice_answers.updateMany({
            where: {
              attempt_id: userQuizAttempt.id,
              AND: {
                user_id: userId,
                multiple_choice_options: {
                  objective_questions: {
                    quiz_id: quizId,
                    correct_answer: {
                      in: getUserAnswer.map((answer) => answer.option_text),
                    },
                  },
                },
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              },
            },
            data: {
              is_correct: true,
            },
          });

        if (!updateUserMultipleChoiceAnswers) {
          throw new Error("Failed to update user multiple choice answers");
        }

        // Get user correct answers
        const userCorrectAnswers =
          await tx.user_multiple_choice_answers.findMany({
            where: {
              attempt_id: userQuizAttempt.id,
              AND: {
                user_id: userId,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              },
            },

            select: {
              is_correct: true,
            },
          });

        if (!userCorrectAnswers) {
          throw new Error("User correct answers not found");
        }

        if (!userQuizAttempt.start_time) {
          throw new Error("Quiz attempt not started");
        }

        // Update user quiz attempt score and time taken
        const userScore = await tx.user_quiz_attempts.update({
          where: {
            id: userQuizAttempt.id,
          },
          data: {
            score: userCorrectAnswers.filter((answer) => answer.is_correct)
              .length,
            completed_at: new Date(),
            timeTaken: new Date(
              new Date().getTime() - userQuizAttempt.start_time.getTime()
            ),
            attempt_count: {
              increment: 1,
            },
          },
        });

        if (!userScore) {
          throw new Error("Failed to submit quiz attempt");
        }

        const upsertUserCompletedQuiz = await tx.user_completed_quizzes.upsert({
          where: {
            user_id: userQuizAttempt.user_id,
            quiz_id: quizId,
          },
          create: {
            user_id: userQuizAttempt.user_id,
            quiz_id: quizId,
            completed_at:
              (
                await tx.user_quiz_attempts.findUnique({
                  where: {
                    id: userQuizAttempt.user_id,
                  },
                  select: {
                    completed_at: true,
                  },
                })
              )?.completed_at ?? new Date(),
          },
          update: {
            completed_at:
              (
                await tx.user_quiz_attempts.findUnique({
                  where: {
                    id: userQuizAttempt.user_id,
                  },
                  select: {
                    completed_at: true,
                  },
                })
              )?.completed_at ?? new Date(),
          },
        });

        if (!upsertUserCompletedQuiz) {
          throw new Error("Failed to update user completed quizzes");
        }

        return { message: "Quiz attempt submitted successfully" };
      });

      if (resultTransaction) {
        resolve(resultTransaction);
      }
    } catch (error) {
      reject(error);
    }
  });
};
