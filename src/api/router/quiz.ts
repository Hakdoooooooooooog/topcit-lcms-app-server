import { Router } from "express";
import { ChapterWithQuiz } from "../Controller/Quiz";

export default (router: Router) => {
  router.get("/api/quiz/chapter", ChapterWithQuiz);
};
