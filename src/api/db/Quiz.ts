import { quiz, objective_questions } from "@prisma/client";
import { prisma } from "../services/prisma";

export interface QuizWithObjectiveQuestions extends quiz {
  objective_questions: objective_questions[];
}

export const getChapterWithQuizAndObjectiveQuestion = async (
  chapterId: number
): Promise<QuizWithObjectiveQuestions> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.quiz.findFirst({
        where: {
          id: chapterId,
        },
        include: {
          objective_questions: true,
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
