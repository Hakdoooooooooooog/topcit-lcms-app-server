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

export const SubmitQuiz = async (req: Request, res: Response) => {
  const { topicId, userId, quizId } = req.query;
  const assessmentData: { [quizID: string]: string } = req.body;

  if (!topicId || !userId || !quizId) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (!assessmentData) {
    res.status(400).json({ error: "Assessment data not found" });
    return;
  }

  Object.entries(assessmentData).forEach(([key, value]) => {
    console.log(`Question ID: ${key}, Answer: ${value}`);
  });

  try {
    res.status(200).json({ message: "Quiz submitted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
