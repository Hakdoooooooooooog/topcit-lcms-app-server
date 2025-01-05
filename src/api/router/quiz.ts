import { Router } from "express";
import {
  TopicWithQuiz,
  StartQuiz,
  SubmitQuiz,
  CreateQuiz,
  UpdateQuiz,
  TopicQuizAssessments,
} from "../Controller/Quiz";
import { validateData } from "../middleware/validation";
import { QuizSchema } from "../schema/Quiz";

export default (router: Router) => {
  router.get("/quizzes/topic", TopicWithQuiz);

  router.get("/admin/quizzes/assessments", TopicQuizAssessments);

  // Initial quiz attempt
  router.post("/quizzes/start", StartQuiz);

  // Create and update quiz
  router.post(
    "/admin/quizzes/manage",
    validateData({ schema: QuizSchema }),
    CreateQuiz
  );
  router.put(
    "/admin/quizzes/update",
    validateData({ schema: QuizSchema }),
    UpdateQuiz
  );

  // Submit quiz
  router.post("/quizzes/submit", SubmitQuiz);
};
