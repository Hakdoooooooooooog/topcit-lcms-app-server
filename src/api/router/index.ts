import express from "express";
import authentication from "./authentication";
import user from "./user";
import Topics from "./Topics";
import quiz from "./quiz";
import chapters from "./chapters";

const router = express.Router();

export default (): express.Router => {
  authentication(router);
  user(router);
  Topics(router);
  quiz(router);
  chapters(router);
  return router;
};
