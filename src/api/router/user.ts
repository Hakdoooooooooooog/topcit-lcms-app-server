import { Router } from "express";
import {
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
  router.get("/user/profile", validateUserToken, userData);
  router.get("/user/progress", validateUserToken, userProgressTrack);

  router.post("/user/logout", userLogout);

  router.put(
    "/user/updateData",
    validateData({ schema: EditProfileSchema }),
    validateUserToken,
    updateUserData
  );
  router.put("/user/refresh", userRefreshTokenAccess);
};
