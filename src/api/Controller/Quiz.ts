import { Request, Response } from "express";
import { serializeBigInt } from "../services";
import { getChapterWithQuizAndObjectiveQuestion } from "../db/Quiz";

export const ChapterWithQuiz = async (req: Request, res: Response) => {
  try {
    const chapter = await getChapterWithQuizAndObjectiveQuestion();

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
