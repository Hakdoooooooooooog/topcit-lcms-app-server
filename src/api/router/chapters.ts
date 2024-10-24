import { Router } from "express";
import {
  CreateChapter,
  getChapterFilesByChapterId,
  getChaptersByChapterId,
  updateChapter,
} from "../Controller/Chapters";
import { uploadFile } from "../services/multer";

// Todo: Add authentication middleware
// Todo: Add authorization middleware
// Todo: Add validation middleware

export default (router: Router) => {
  // Chapters with files and subchapters
  router.get("/chapters/:parent_chapter_id", getChaptersByChapterId);
  router.get("/chapters/files/:chapter_id", getChapterFilesByChapterId);

  // Chapters
  router.post(
    "/admin/chapter/create",
    uploadFile("chapterFile"),
    CreateChapter
  ); // Todo: Create a new chapter
  router.put(
    "/admin/chapter/update/:chapterId",
    uploadFile("chapterFile"),
    updateChapter
  ); // Update a chapter with a file
};
