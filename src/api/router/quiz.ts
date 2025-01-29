import { Router } from "express";
import {
  TopicWithQuiz,
  StartQuiz,
  SubmitQuiz,
  CreateQuiz,
  UpdateQuiz,
  TopicQuizAssessments,
  AssessmentScore,
  QuizAssessment,
} from "../Controller/Quiz";
import { validateData } from "../middleware/validation";
import { QuizSchema } from "../schema/Quiz";

export default (router: Router) => {
  router.get("/quizzes/topic", TopicWithQuiz);

  router.get("/quizzes/topic/assessment/:quizID", QuizAssessment);

  // Get Assessment score for quizzes by quizID
  router.get("/quizzes/assessment/:quizID", AssessmentScore);

  // Initial quiz attempt
  router.post("/quizzes/start", StartQuiz);

  // Quiz related endpoints for admin

  // Get quiz assessments
  router.get("/admin/quizzes/assessments", TopicQuizAssessments);

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
  router.post("/quizzes/submit/:topicId/:quizId", SubmitQuiz);
};
