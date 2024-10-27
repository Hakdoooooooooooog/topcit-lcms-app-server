import { Router } from "express";
import {
  CreateTopic,
  Topics,
  TopicsWithAllChapters,
  TopicWithChapters,
  TopicWithId,
  UpdateTopic,
} from "../Controller/Topics";
import { upload } from "../services/multer";

// TODO: Add the necessary authentication middleware to the routes
// TODO: Add the necessary validation middleware to the routes
// TODO: Add the necessary authorization middleware to the routes

export default (router: Router) => {
  // Topics
  router.get("/api/topics", Topics);
  router.get("/api/topics/chapters", TopicsWithAllChapters);
  // Topics with all chapters
  router.get("/api/topics/:topic_id", TopicWithId);
  router.get("/api/topics/chapters/:topic_id", TopicWithChapters);

  router.post("/api/admin/topic/create", upload.none(), CreateTopic); // Create a new topic
  router.put("/api/admin/topic/update/:topic_id", UpdateTopic); // Update a topic
  router.delete("/api/admin/topic/delete/:topic_id"); // Delete a topic
};
