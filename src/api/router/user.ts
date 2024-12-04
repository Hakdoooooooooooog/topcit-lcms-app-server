import { Router } from "express";
import {
  updateUserChapterProgress,
  updateUserData,
  userData,
  userLogout,
  userProgressTrack,
  userRefreshTokenAccess,
} from "../Controller/User";
import { validateData } from "../middleware/validation";
import { validateUserToken } from "../middleware";
import { EditProfileSchema } from "../schema/User";

export default (router: Router) => {
  router.get("/health", (req, res) => {
    res.status(200).send({ message: "Server is running", status: 200 });
  });

  router.get("/user/profile", validateUserToken, userData);
  router.get("/user/progress", validateUserToken, userProgressTrack);

  router.post("/user/logout", userLogout);
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
  router.put("/user/refresh", userRefreshTokenAccess);
};
