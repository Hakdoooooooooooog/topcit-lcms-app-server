import { Request, Response } from "express";
import { serializeBigInt } from "../services";
import {
  getTopicWithQuiz,
  getQuizUserAttempt,
  initialQuizAttempt,
  submitQuizAttempt,
  updateExistingInitialQuizAttempt,
  createQuiz,
  getQuizAssessments,
  editQuiz,
  getQuizAssessmentScores,
  getTopicQuizAssessments,
} from "../db/Quiz";
import { QuizDetails } from "../types/quiz";
import { z } from "zod";
import { QuizSchemaStage2 } from "../schema/Quiz";

export const TopicWithQuiz = async (req: Request, res: Response) => {
  const { studentId, isAuth } = req.query;

  if (!studentId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const chapter = await getTopicWithQuiz(parseInt(studentId as string));

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const QuizAssessment = async (req: Request, res: Response) => {
  const { quizID } = req.params;
  const { studentId, isAuth } = req.query;

  if (!quizID) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (!studentId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const chapter = await getTopicQuizAssessments({ quizID: Number(quizID) });

    res.status(200).json(serializeBigInt(chapter));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const AssessmentScore = async (req: Request, res: Response) => {
  const { studentId, isAuth } = req.query;

  if (!studentId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  try {
    const quizScores = await getQuizAssessmentScores(
      parseInt(studentId as string)
    );

    res.status(200).json(serializeBigInt(quizScores));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const TopicQuizAssessments = async (req: Request, res: Response) => {
  const { studentId, isAuth } = req.query;

  if (!studentId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const chapterQuizzes = await getQuizAssessments();

    res.status(200).json(serializeBigInt(chapterQuizzes));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const UpdateQuiz = async (req: Request, res: Response) => {
  const {
    topicId,
    quizId,
    chapterSelect,
    quizTitle,
    maxAttempts,
    quizQuestions,
  } = req.body;
  const { isAuth, studentId } = req.query;

  if (
    !topicId &&
    !quizId &&
    !chapterSelect &&
    !quizTitle &&
    !quizQuestions &&
    !maxAttempts
  ) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true" || !studentId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    // Changing the correct answer based on the option index if the question type is multiple choice, Otherwise return the other question types as it is
    const quizQuestionCorrectAnswer = (
      quizQuestions as z.infer<typeof QuizSchemaStage2>["quizQuestions"]
    ).map((question) => {
      if (question.questionType === "Multiple Choice") {
        const correctAnswerIndex = Number(question.correctAnswer);
        const correctAnswer =
          question.multipleChoiceOptions[correctAnswerIndex - 1].optionText;

        return {
          ...question,
          correctAnswer,
        };
      }

      return question;
    });

    // Edit quiz
    const quizDetails: QuizDetails = {
      topics: {
        topicId: parseInt(topicId),
      },
      chapterSelect,
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
  const {
    topicId,
    quizId,
    chapterSelect,
    quizTitle,
    maxAttempts,
    quizQuestions,
  } = req.body;
  const { isAuth, studentId } = req.query;

  if (
    !topicId ||
    !quizId ||
    !chapterSelect ||
    !quizTitle ||
    !quizQuestions ||
    !isAuth ||
    !studentId ||
    !maxAttempts
  ) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Changing the correct answer based on the option index if the question type is multiple choice, Otherwise return the other question types as it is
  const quizQuestionCorrectAnswer = (
    quizQuestions as z.infer<typeof QuizSchemaStage2>["quizQuestions"]
  ).map((question) => {
    if (question.questionType === "Multiple Choice") {
      const correctAnswerIndex = Number(question.correctAnswer);
      const correctAnswer =
        question.multipleChoiceOptions[correctAnswerIndex - 1].optionText;

      return {
        ...question,
        correctAnswer,
      };
    }

    return question;
  });

  const quizDetails: QuizDetails = {
    topics: {
      topicId: parseInt(topicId),
    },
    chapterId: parseInt(chapterSelect),
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
  const { studentId, isAuth } = req.query;

  if (!topicId || !studentId || !quizId || !isAuth) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (isAuth !== "true") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const userAttempt = await getQuizUserAttempt(
      parseInt(studentId as string),
      parseInt(quizId as string)
    );

    const lastAttempt = userAttempt[userAttempt.length - 1];

    const result = await updateExistingInitialQuizAttempt(
      Number(lastAttempt.id),
      Number(lastAttempt.quiz_id),
      Number(lastAttempt.student_id),
      new Date()
    );

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Quiz attempt not found") {
      try {
        await initialQuizAttempt(
          parseInt(quizId as string),
          parseInt(studentId as string),
          new Date()
        );

        res.status(200).json({ message: "Quiz attempt started." });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  }
};

export const SubmitQuiz = async (req: Request, res: Response) => {
  const { topicId, quizId } = req.params;
  const { studentId, isAuth } = req.query;
  const assessmentData: { [questionId: string]: string } = req.body;

  if (!topicId || !studentId || !quizId || !isAuth) {
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
      parseInt(studentId as string),
      quizUserObjectiveAnswers
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
