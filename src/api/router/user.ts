import { Router } from "express";
import {
  updateUserChapterProgress,
  updateUserData,
  userData,
  userLogout,
  userProgressTrack,
} from "../Controller/User";
import { validateData } from "../middleware/validation";
import { validateUserToken } from "../middleware/validation";
import { EditProfileSchema } from "../schema/User";

export default (router: Router) => {
  router.get("/user/profile", validateUserToken, userData);
  router.get("/user/progress", validateUserToken, userProgressTrack);

  router.post(
    "/user/progress/update",
    validateUserToken,
    updateUserChapterProgress
  );

  router.put(
    "/user/updateData",
    validateData({ schema: EditProfileSchema }),
    validateUserToken,
    updateUserData
  );

  router.post("/user/logout", userLogout);
};
