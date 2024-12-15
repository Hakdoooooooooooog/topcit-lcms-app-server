import { Request, Response } from "express";
import { serializeBigInt } from "../services";
import {
  getChapterWithQuizAndObjectiveQuestion,
  getQuizUserAttempt,
  initialQuizAttempt,
  submitQuizAttempt,
  updateExistingInitialQuizAttempt,
} from "../db/Quiz";

export const ChapterWithQuiz = async (req: Request, res: Response) => {
  const { userId, isAuth } = req.query;

  if (!userId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const chapter = await getChapterWithQuizAndObjectiveQuestion(
      parseInt(userId as string)
    );

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const StartQuiz = async (req: Request, res: Response) => {
  const { topicId, quizId } = req.body;
  const { userId, isAuth } = req.query;

  if (!topicId || !userId || !quizId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const userAttempt = await getQuizUserAttempt(
      parseInt(quizId as string),
      parseInt(userId as string)
    );

    const result = await updateExistingInitialQuizAttempt(
      Number(userAttempt.id),
      Number(userAttempt.quiz_id),
      Number(userAttempt.user_id),
      new Date()
    );

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Quiz attempt not found") {
      try {
        await initialQuizAttempt(
          parseInt(quizId as string),
          parseInt(userId as string),
          new Date()
        );

        res.status(200).json({ message: "Quiz attempt started" });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  }
};

export const SubmitQuiz = async (req: Request, res: Response) => {
  const { topicId, userId, quizId, isAuth } = req.query;
  const assessmentData: { [quizID: string]: string } = req.body;

  if (!topicId || !userId || !quizId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!assessmentData) {
    res.status(400).json({ message: "Assessment data not found" });
    return;
  }

  try {
    // Insert quiz attempt answers
    const quizUserObjectiveAnswers = Object.entries(assessmentData).map(
      ([questionId, answer]) => {
        return {
          question_id: parseInt(questionId),
          user_answer: answer,
        };
      }
    );

    const result = await submitQuizAttempt(
      parseInt(quizId as string),
      parseInt(userId as string),
      quizUserObjectiveAnswers
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
