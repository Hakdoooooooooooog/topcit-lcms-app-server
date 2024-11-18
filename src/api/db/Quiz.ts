import {
  quiz,
  objective_questions,
  multiple_choice_options,
} from "@prisma/client";
import { prisma } from "../services/prisma";

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
