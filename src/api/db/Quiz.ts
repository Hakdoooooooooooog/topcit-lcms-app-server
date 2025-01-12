import {
  prisma,
  objective_questions,
  quiz,
  user_quiz_attempts,
  topics,
} from "../services/prisma";
import {
  QuizDetails,
  QuizzesAssessment,
  TopicWithQuizAndObjectiveQuestion,
} from "../types/quiz";

export const getTopicWithQuizAndObjectiveQuestion = async (
  studentId: number
): Promise<TopicWithQuizAndObjectiveQuestion[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapterResult = await prisma.topics.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          quiz: {
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              topic_id: true,
              title: true,
              quiz_type: true,
              max_attempts: true,
              created_at: true,
              user_quiz_attempts: {
                where: {
                  student_id: studentId,
                },
                select: {
                  id: true,
                  quiz_id: true,
                  student_id: true,
                  start_time: true,
                  completed_at: true,
                  score: true,
                  timeTaken: true,
                  attempt_count: true,
                },
              },
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
                    select: {
                      option_text: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      resolve(chapterResult);
    } catch (error: any) {
      reject(new Error("Failed to get chapter: " + error.message));
    }
  });
};

export const getQuizAssessments = async (): Promise<QuizzesAssessment[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapterResult = await prisma.$transaction(async (tx) => {
        const result = await tx.topics.findMany({
          orderBy: {
            id: "asc",
          },
          include: {
            quiz: {
              orderBy: {
                id: "asc",
              },
              select: {
                id: true,
                topic_id: true,
                title: true,
                quiz_type: true,
                max_attempts: true,
                created_at: true,
                objective_questions: {
                  orderBy: {
                    id: "asc",
                  },
                  select: {
                    id: true,
                    quiz_id: true,
                    question: true,
                    question_type: true,
                    correct_answer: true,
                    multiple_choice_options: {
                      orderBy: {
                        id: "asc",
                      },
                      select: {
                        option_text: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        return result;
      });

      resolve(chapterResult);
    } catch (error: any) {
      reject(new Error("Failed to get chapter: " + error.message));
    }
  });
};

export const getQuizByTopicId = async (topicId: number): Promise<quiz[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.quiz.findMany({
        where: {
          topic_id: topicId,
        },
      });

      resolve(result);
    } catch (error: any) {
      reject(new Error("Failed to get quiz by topic ID: " + error.message));
    }
  });
};

export const createQuiz = async (
  quizDetails: QuizDetails
): Promise<{ message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const createQuiz = await prisma.$transaction(async (tx) => {
        const createdQuiz = await tx.quiz.create({
          data: {
            topic_id: quizDetails.topics.topicId,
            title: quizDetails.title,
            quiz_type: quizDetails.quizType ?? "objective",
            max_attempts: quizDetails.maxAttempts,
            created_at: new Date(),
          },
          select: {
            id: true,
          },
        });

        await tx.objective_questions.createMany({
          data: quizDetails.objectiveQuestions.map((question) => {
            return {
              quiz_id: createdQuiz.id,
              question: question.question,
              question_type: question.questionType,
              correct_answer: question.correctAnswer,
            };
          }),
        });

        const objectiveQuestions = await tx.objective_questions.findMany({
          where: {
            quiz_id: createdQuiz.id,
          },
          select: {
            id: true,
            question: true,
          },
        });

        await tx.multiple_choice_options.createMany({
          data: quizDetails.objectiveQuestions.flatMap((question) => {
            const objectiveQuestion = objectiveQuestions.find(
              (oq) => oq.question === question.question
            );

            if (!objectiveQuestion) {
              throw new Error(
                `Objective question not found for question: ${question.question}`
              );
            }

            return question.multipleChoiceOptions.map((option) => {
              return {
                objective_question_id: objectiveQuestion.id,
                option_text: option.optionText,
              };
            });
          }),
        });

        return { message: "Quiz created/updated successfully." };
      });

      resolve(createQuiz);
    } catch (error: any) {
      reject(new Error("Failed to create quiz"));
      console.error(error);
    }
  });
};

export const editQuiz = async (
  quizDetails: QuizDetails
): Promise<{ message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const editQuiz = await prisma.$transaction(async (tx) => {
        await tx.quiz.update({
          where: {
            id: quizDetails.quizId,
          },
          data: {
            title: quizDetails.title,
            quiz_type: quizDetails.quizType ?? "objective",
            max_attempts: quizDetails.maxAttempts,
            objective_questions: {
              updateMany: quizDetails.objectiveQuestions.map((question) => {
                return {
                  where: {
                    quiz_id: quizDetails.quizId,
                    question: question.question,
                  },
                  data: {
                    question_type: question.questionType,
                    correct_answer: question.correctAnswer,
                  },
                };
              }),
            },
          },
        });

        await tx.multiple_choice_options.updateMany({
          where: {
            objective_question_id: {
              in: quizDetails.objectiveQuestions.map((_question) =>
                BigInt(quizDetails.quizId ?? 0)
              ),
            },
          },
          data: {
            option_text: quizDetails.objectiveQuestions
              .flatMap((question) => question.multipleChoiceOptions)
              .map((option) => option.optionText)
              .join(", "),
          },
        });

        return { message: "Quiz updated successfully." };
      });

      resolve(editQuiz);
    } catch (error: any) {
      reject(new Error("Failed to update quiz"));
      console.error(error);
    }
  });
};

export const getQuizUserAttempt = async (
  studentId: number,
  quizId: number
): Promise<user_quiz_attempts> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.findFirst({
        where: {
          quiz_id: quizId,
          AND: {
            student_id: studentId,
          },
        },
      });

      if (result) {
        resolve(result);
      } else {
        reject(new Error("Quiz attempt not found"));
      }
    } catch (error: any) {
      reject(new Error("Failed to get quiz attempt: " + error.message));
    }
  });
};

// Start initial quiz attempt if user starts quiz
export const initialQuizAttempt = async (
  quizId: number,
  studentId: number,
  startedAt: Date
): Promise<{ message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      await prisma.user_quiz_attempts.create({
        data: {
          quiz_id: quizId,
          student_id: studentId,
          start_time: startedAt,
        },
      });

      resolve({ message: "Quiz attempt started successfully" });
    } catch (error: any) {
      reject(new Error("Failed to start quiz attempt: " + error.message));
    }
  });
};

// update initial quiz attempt if user starts quiz again
export const updateExistingInitialQuizAttempt = async (
  attemptId: number,
  quizId: number,
  studentId: number,
  startedAt: Date
): Promise<Error | { message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      await prisma.user_quiz_attempts.update({
        where: {
          id: attemptId,
          AND: {
            quiz_id: quizId,
            student_id: studentId,
          },
        },
        data: {
          start_time: startedAt,
        },
      });

      resolve({ message: "Quiz attempt updated successfully" });
    } catch (error: any) {
      reject(new Error("Failed to update quiz attempt: " + error.message));
    }
  });
};

// Submit quiz attempt
export const submitQuizAttempt = async (
  quizId: number,
  studentId: number,
  quizUserObjectiveAnswers: { question_id: number; user_answer: string }[]
): Promise<{ message: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resultTransaction = await prisma.$transaction(
        async (tx) => {
          // Get user quiz attempt
          const userQuizAttempt = await tx.user_quiz_attempts.findFirst({
            where: {
              student_id: studentId,
              quiz_id: quizId,
              start_time: {
                not: null,
              },
            },
          });

          if (!userQuizAttempt) {
            throw new Error("Quiz attempt not found");
          }

          const getMultipleChoiceId = await tx.multiple_choice_options.findMany(
            {
              where: {
                objective_question_id: {
                  in: quizUserObjectiveAnswers.map(
                    (answer) => answer.question_id
                  ),
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
            }
          );

          if (!getMultipleChoiceId) {
            throw new Error("Multiple choice options not found");
          }

          const createUserMultipleChoiceAnswers =
            await tx.user_multiple_choice_answers.createMany({
              data: quizUserObjectiveAnswers.map((answer) => {
                return {
                  attempt_id: userQuizAttempt.id,
                  student_id: studentId,
                  question_id: answer.question_id,
                  user_selected_option_id: getMultipleChoiceId.find(
                    (option) =>
                      option.option_text === answer.user_answer &&
                      Number(option.objective_question_id) ===
                        answer.question_id
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
                  student_id: studentId,
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
                  student_id: studentId,
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
                  student_id: studentId,
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

          const userExistingCompletedQuizzes =
            await tx.user_completed_quizzes.findFirst({
              where: {
                student_id: userQuizAttempt.student_id,
                quiz_id: userQuizAttempt.quiz_id,
              },
              select: {
                id: true,
              },
            });

          // Update user completed quizzes and user progress
          const userCompletedQuizzes = await tx.user_completed_quizzes.upsert({
            where: {
              id: userExistingCompletedQuizzes?.id ?? 0,
            },
            update: {
              completed_at: new Date(),
            },
            create: {
              topic_id:
                (
                  await tx.quiz.findUnique({
                    where: {
                      id: userQuizAttempt.quiz_id,
                    },
                    select: {
                      topic_id: true,
                    },
                  })
                )?.topic_id ?? 0, // Provide a default value or handle appropriately
              student_id: userQuizAttempt.student_id,
              quiz_id: userQuizAttempt.quiz_id,
              completed_at: new Date(),
            },
          });

          if (!userCompletedQuizzes) {
            throw new Error("Failed to update user completed quizzes");
          }

          const userProgressSet = await tx.user_progress.upsert({
            where: {
              student_id: studentId,
            },
            create: {
              student_id: studentId,
              curr_quiz_id: quizId,
            },
            update: {
              curr_quiz_id: quizId,
            },
          });

          if (!userProgressSet) {
            throw new Error("Error setting user progress");
          }

          return { message: "Quiz attempt submitted successfully" };
        },
        {
          timeout: 15000, // 15 seconds
          maxWait: 5000, // 5 seconds
        }
      );

      if (resultTransaction) {
        resolve(resultTransaction);
      }
    } catch (error: any) {
      reject(new Error("Failed to submit quiz attempt: " + error.message));
    }
  });
};
