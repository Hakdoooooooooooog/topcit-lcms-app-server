import { Request, Response } from "express";
import { serializeBigInt } from "../services";
import {
  getTopicWithQuizAndObjectiveQuestion,
  getQuizUserAttempt,
  initialQuizAttempt,
  submitQuizAttempt,
  updateExistingInitialQuizAttempt,
  createQuiz,
  getQuizAssessments,
  editQuiz,
} from "../db/Quiz";
import { QuizDetails } from "../types/quiz";
import { z } from "zod";
import { QuizSchemaStage2 } from "../schema/Quiz";

export const TopicWithQuiz = async (req: Request, res: Response) => {
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
    const chapter = await getTopicWithQuizAndObjectiveQuestion(
      parseInt(userId as string)
    );

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const TopicQuizAssessments = async (req: Request, res: Response) => {
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
    const chapter = await getQuizAssessments();

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const UpdateQuiz = async (req: Request, res: Response) => {
  const { topicId, quizTitle, maxAttempts, quizQuestions } = req.body;
  const { isAuth, userId } = req.query;

  if (
    !topicId ||
    !quizTitle ||
    !quizQuestions ||
    !isAuth ||
    !userId ||
    !maxAttempts
  ) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    // Changing the correct answer based on the option index
    const quizQuestionCorrectAnswer = (
      quizQuestions as z.infer<typeof QuizSchemaStage2>["quizQuestions"]
    ).map((question) => {
      const correctAnswerIndex = Number(question.correctAnswer);
      const correctAnswer =
        question.multipleChoiceOptions[correctAnswerIndex - 1].optionText;

      return {
        ...question,
        correctAnswer,
      };
    });

    // Edit quiz
    const quizDetails: QuizDetails = {
      topics: {
        topicId: parseInt(topicId),
      },
      quizId: parseInt(quizQuestionCorrectAnswer[0].quizId),
      title: quizTitle,
      maxAttempts: parseInt(maxAttempts),
      objectiveQuestions: quizQuestionCorrectAnswer,
    };

    await editQuiz(quizDetails);

    res.status(200).json({ message: "Quiz updated" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const CreateQuiz = async (req: Request, res: Response) => {
  const { topicId, quizTitle, maxAttempts, quizQuestions } = req.body;
  const { isAuth, userId } = req.query;

  if (
    !topicId ||
    !quizTitle ||
    !quizQuestions ||
    !isAuth ||
    !userId ||
    !maxAttempts
  ) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Changing the correct answer based on the option index
  const quizQuestionCorrectAnswer = (
    quizQuestions as z.infer<typeof QuizSchemaStage2>["quizQuestions"]
  ).map((question) => {
    const correctAnswerIndex = Number(question.correctAnswer);
    const correctAnswer =
      question.multipleChoiceOptions[correctAnswerIndex - 1].optionText;

    return {
      ...question,
      correctAnswer,
    };
  });

  // Get Quiz id from the first question

  const quizId = quizQuestionCorrectAnswer[0].quizId;

  const quizDetails: QuizDetails = {
    topics: {
      topicId: parseInt(topicId),
    },
    quizId: parseInt(quizId),
    title: quizTitle,
    maxAttempts: parseInt(maxAttempts),
    objectiveQuestions: quizQuestionCorrectAnswer,
  };

  try {
    // Insert quiz
    await createQuiz(quizDetails);

    res.status(200).json({ message: "Quiz created/updated" });
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
      parseInt(userId as string),
      parseInt(quizId as string)
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
