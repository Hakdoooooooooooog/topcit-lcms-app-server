import { Router } from "express";
import { ChapterWithQuiz, StartQuiz, SubmitQuiz } from "../Controller/Quiz";

export default (router: Router) => {
  router.get("/quizzes/topic", ChapterWithQuiz);

  // Initial quiz attempt
  router.post("/quizzes/start", StartQuiz);

  // Submit quiz
  router.post("/quizzes/submit", SubmitQuiz);
};
