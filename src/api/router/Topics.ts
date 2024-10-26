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
  router.get("/topics", Topics);
  router.get("/topics/chapters", TopicsWithAllChapters);
  // Topics with all chapters
  router.get("/topics/:topic_id", TopicWithId);
  router.get("/topics/chapters/:topic_id", TopicWithChapters);

  router.post("/admin/topic/create", upload.none(), CreateTopic); // Create a new topic
  router.put("/admin/topic/update/:topic_id", UpdateTopic); // Update a topic
  router.delete("/admin/topic/delete/:topic_id"); // Delete a topic
};
