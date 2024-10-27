import { Router } from "express";
import {
  CreateChapter,
  getChapterFilesByChapterId,
  getSubChaptersByChapterId,
  updateChapter,
} from "../Controller/Chapters";
import { uploadFile } from "../services/multer";

// Todo: Add authentication middleware
// Todo: Add authorization middleware
// Todo: Add validation middleware

export default (router: Router) => {
  // Chapters with files and subchapters
  router.get(
    "/api/chapters/subchapters/:parent_chapter_id",
    getSubChaptersByChapterId
  );
  router.get("/api/chapters/files/:chapter_id", getChapterFilesByChapterId);

  // Chapters
  router.post(
    "/api/admin/chapter/create",
    uploadFile("chapterFile"),
    CreateChapter
  ); // Todo: Create a new chapter
  router.put(
    "/api/admin/chapter/update/:chapterId",
    uploadFile("chapterFile"),
    updateChapter
  ); // Update a chapter with a file
};
