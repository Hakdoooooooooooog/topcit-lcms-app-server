import { Router } from "express";
import {
  ChapterWithQuiz,
  ForfeitQuiz,
  StartQuiz,
  SubmitQuiz,
} from "../Controller/Quiz";

export default (router: Router) => {
  router.get("/quizzes/topic", ChapterWithQuiz);

  // Initial quiz attempt
  router.post("/quizzes/start", StartQuiz);

  // Update quiz attempt if user quit or navigate away from quiz
  router.post("/quizzes/forfeit", ForfeitQuiz);

  // Submit quiz
  router.post("/quizzes/submit", SubmitQuiz);
};
