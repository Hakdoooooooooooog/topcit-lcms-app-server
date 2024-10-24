import { Request, Response } from "express";
import { serializeBigInt } from "../services";
import { getChapterWithQuizAndObjectiveQuestion } from "../db/Quiz";

export const ChapterWithQuiz = async (req: Request, res: Response) => {
  const chapter_id = req.query.chapter_id;

  if (!Number.isInteger(Number(chapter_id))) {
    res.status(400).json({ error: "Invalid chapter_id" });
    return;
  }

  if (!chapter_id) {
    res.sendStatus(400);
    return;
  }

  try {
    const chapter = await getChapterWithQuizAndObjectiveQuestion(
      Number(chapter_id)
    );

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
