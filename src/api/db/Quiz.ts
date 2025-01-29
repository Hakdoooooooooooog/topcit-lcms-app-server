import { prisma, quiz, user_quiz_attempts } from "../services/prisma";
import {
  QuizAssessmentScores,
  QuizDetails,
  QuizzesAssessment,
  TopicQuizAssessments,
  TopicWithQuiz,
} from "../types/quiz";

export const getTopicWithQuiz = async (
  studentId: number
): Promise<TopicWithQuiz[]> => {
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
              chapter_id: true,
              _count: {
                select: {
                  user_quiz_attempts: {
                    where: {
                      student_id: studentId,
                    },
                  },
                  objective_questions: true,
                },
              },
              chapters: {
                select: {
                  title: true,
                },
              },
              user_quiz_attempts: {
                where: {
                  student_id: studentId,
                },
                select: {
                  quiz_id: true,
                  score: true,
                },
                take: 1,
                orderBy: {
                  attempt_count: "desc",
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

export const getTopicQuizAssessments = async ({
  quizID,
}: {
  quizID: number;
}): Promise<TopicQuizAssessments[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const assessmentQuestions = await prisma.quiz.findMany({
        where: {
          id: quizID,
        },
        select: {
          objective_questions: {
            select: {
              id: true,
              quiz_id: true,
              question: true,
              question_type: true,
              correct_answer: true,
              multiple_choice_options: {
                select: {
                  option_text: true,
                },
              },
            },
          },
        },
      });

      resolve(assessmentQuestions);
    } catch (error: any) {
      reject(new Error("Failed to get chapter: " + error.message));
    }
  });
};

export const getQuizAssessmentScores = async (
  studentId: number
): Promise<QuizAssessmentScores[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapterResult = await prisma.topics.findMany({
        select: {
          id: true,
          topictitle: true,
          quiz: {
            select: {
              id: true,
              title: true,
              max_attempts: true,
              _count: {
                select: {
                  objective_questions: true,
                },
              },
              user_quiz_attempts: {
                where: {
                  student_id: studentId,
                },
                select: {
                  quiz_id: true,
                  score: true,
                  timeTaken: true,
                  attempt_count: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
        },
        orderBy: {
          id: "asc",
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
            chapters: {
              orderBy: {
                id: "asc",
              },
              select: {
                id: true,
                topic_id: true,
                title: true,
              },
            },
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
                chapter_id: true,
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
        const questionTypes = quizDetails.objectiveQuestions.map(
          (question) => question.questionType
        );

        if (questionTypes.includes("Multiple Choice")) {
          const createdQuiz = await tx.quiz.create({
            data: {
              topic_id: quizDetails.topics.topicId,
              chapter_id: quizDetails.chapterId ?? 0,
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
        } else {
          const createdQuiz = await tx.quiz.create({
            data: {
              topic_id: quizDetails.topics.topicId,
              chapter_id: quizDetails.chapterId ?? 0,
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
        }

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
      const editQuiz = await prisma.$transaction(
        async (tx) => {
          const chapterId = await tx.chapters.findFirst({
            where: {
              title: quizDetails.chapterSelect,
            },
            select: {
              id: true,
            },
          });

          for (const question of quizDetails.objectiveQuestions) {
            if (question.questionType === "Multiple Choice") {
              question.multipleChoiceOptions.forEach((option) => {
                if (!option.optionText) {
                  throw new Error("Option text is required");
                }
              });

              await tx.quiz.update({
                where: {
                  id: quizDetails.quizId,
                  AND: {
                    topic_id: quizDetails.topics.topicId,
                    chapter_id: chapterId?.id ?? 0,
                  },
                },
                data: {
                  title: quizDetails.title,
                  quiz_type: quizDetails.quizType ?? "objective",
                  max_attempts: quizDetails.maxAttempts,
                  objective_questions: {
                    updateMany: quizDetails.objectiveQuestions.map(
                      (question) => {
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
                      }
                    ),
                  },
                },
              });

              for (const question of quizDetails.objectiveQuestions) {
                const objectiveQuestion =
                  await tx.objective_questions.findFirst({
                    where: {
                      quiz_id: quizDetails.quizId,
                      question: question.question,
                    },
                  });

                if (objectiveQuestion) {
                  if (question.multipleChoiceOptions) {
                    for (const option of question.multipleChoiceOptions) {
                      await tx.multiple_choice_options.create({
                        data: {
                          objective_question_id: objectiveQuestion.id,
                          option_text: option.optionText,
                        },
                      });
                    }
                  }
                }
              }
            } else {
              // delete multiple choice options if question type is not multiple choice

              const objectiveQuestionId =
                await tx.objective_questions.findFirst({
                  where: {
                    quiz_id: quizDetails.quizId,
                    question: question.question,
                  },
                  select: {
                    id: true,
                  },
                });

              if (!objectiveQuestionId) {
                throw new Error("Objective question not found");
              }

              await tx.multiple_choice_options.deleteMany({
                where: {
                  objective_question_id: objectiveQuestionId.id,
                },
              });

              await tx.quiz.update({
                where: {
                  id: quizDetails.quizId,
                  AND: {
                    topic_id: quizDetails.topics.topicId,
                    chapter_id: chapterId?.id ?? 0,
                  },
                },
                data: {
                  title: quizDetails.title,
                  quiz_type: quizDetails.quizType ?? "objective",
                  max_attempts: quizDetails.maxAttempts,
                  objective_questions: {
                    updateMany: quizDetails.objectiveQuestions.map(
                      (question) => {
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
                      }
                    ),
                  },
                },
              });
            }
          }

          return { message: "Quiz updated successfully." };
        },
        {
          timeout: 15000,
          maxWait: 5000,
        }
      );

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
): Promise<user_quiz_attempts[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.user_quiz_attempts.findMany({
        where: {
          student_id: studentId,
          quiz_id: quizId,
        },
      });

      if (result && result.length > 0) {
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
          attempt_count: 1,
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

          // Get question types for all questions
          const questionTypes = await tx.objective_questions.findMany({
            where: {
              id: {
                in: quizUserObjectiveAnswers.map(
                  (answer) => answer.question_id
                ),
              },
            },
            select: {
              id: true,
              question_type: true,
            },
          });

          // Filter multiple choice questions
          const multipleChoiceQuestions = quizUserObjectiveAnswers.filter(
            (answer) =>
              questionTypes.find((q) => Number(q.id) === answer.question_id)
                ?.question_type === "Multiple Choice"
          );

          // Filter identification questions
          const identificationQuestions = quizUserObjectiveAnswers.filter(
            (answer) =>
              questionTypes.find((q) => Number(q.id) === answer.question_id)
                ?.question_type === "Identification"
          );

          // Process multiple choice questions
          if (multipleChoiceQuestions.length > 0) {
            const getMultipleChoiceId =
              await tx.multiple_choice_options.findMany({
                where: {
                  objective_question_id: {
                    in: multipleChoiceQuestions.map(
                      (answer) => answer.question_id
                    ),
                  },
                  AND: {
                    option_text: {
                      in: multipleChoiceQuestions.map(
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

            // Create user multiple choice answers
            await tx.user_multiple_choice_answers.createMany({
              data: multipleChoiceQuestions.map((answer) => ({
                attempt_id: userQuizAttempt.id,
                student_id: studentId,
                question_id: answer.question_id,
                user_selected_option_id: getMultipleChoiceId.find(
                  (option) =>
                    option.option_text === answer.user_answer &&
                    Number(option.objective_question_id) === answer.question_id
                )?.id,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              })),
            });

            // update user multiple choice answers if it is correct
            await tx.user_multiple_choice_answers.updateMany({
              where: {
                attempt_id: userQuizAttempt.id,
                student_id: studentId,
                question_id: {
                  in: multipleChoiceQuestions.map(
                    (answer) => answer.question_id
                  ),
                },
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
                objective_questions: {
                  correct_answer: {
                    in: multipleChoiceQuestions.map(
                      (answer) => answer.user_answer
                    ),
                  },
                },
              },
              data: {
                is_correct: true,
              },
            });
          }

          // Process identification questions
          if (identificationQuestions.length > 0) {
            // Get correct answers for identification questions
            const identificationAnswers = await tx.objective_questions.findMany(
              {
                where: {
                  id: {
                    in: identificationQuestions.map((q) => q.question_id),
                  },
                },
                select: {
                  id: true,
                  correct_answer: true,
                },
              }
            );

            // Create user identification answers
            await tx.user_identification_answers.createMany({
              data: identificationQuestions.map((answer) => ({
                attempt_id: userQuizAttempt.id,
                student_id: studentId,
                question_id: answer.question_id,
                user_answer: answer.user_answer,
                is_correct:
                  identificationAnswers
                    .find((q) => Number(q.id) === answer.question_id)
                    ?.correct_answer?.toLowerCase() ===
                  answer.user_answer.toLowerCase(),
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              })),
            });
          }

          // Calculate total score
          const userMultipleChoiceAnswers =
            await tx.user_multiple_choice_answers.findMany({
              where: {
                attempt_id: userQuizAttempt.id,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              },
              select: {
                is_correct: true,
              },
            });

          const userIdentificationAnswers =
            await tx.user_identification_answers.findMany({
              where: {
                attempt_id: userQuizAttempt.id,
                attemptNumber: (userQuizAttempt.attempt_count ?? 0) + 1,
              },
              select: {
                is_correct: true,
              },
            });

          const userAnswers = [
            ...userMultipleChoiceAnswers,
            ...userIdentificationAnswers,
          ];

          // Create user score record
          await tx.user_quiz_attempts.upsert({
            where: {
              id: userQuizAttempt.id,
            },
            create: {
              quiz_id: quizId,
              student_id: studentId,
              score: userAnswers.filter((answer) => answer.is_correct).length,
              completed_at: new Date(),
              timeTaken: userQuizAttempt.start_time
                ? new Date(
                    new Date().getTime() - userQuizAttempt.start_time.getTime()
                  )
                : null,
              attempt_count: (userQuizAttempt.attempt_count ?? 0) + 1,
            },
            update: {
              score: userAnswers.filter((answer) => answer.is_correct).length,
              completed_at: new Date(),
              attempt_count: (userQuizAttempt.attempt_count ?? 0) + 1,
            },
          });

          // Update user progress
          await tx.user_progress.upsert({
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

          return { message: "Quiz attempt submitted successfully" };
        },
        {
          timeout: 15000,
          maxWait: 5000,
        }
      );

      resolve(resultTransaction);
    } catch (error: any) {
      console.error(error);
      reject(new Error("Failed to submit quiz attempt: " + error.message));
    }
  });
};
