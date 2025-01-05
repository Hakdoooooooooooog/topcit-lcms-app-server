import { Router } from "express";
import {
  retryOTP,
  updateUserChapterProgress,
  updateUserData,
  userData,
  userForgotPassword,
  userLogout,
  userProgressTrack,
  userUpdatePassword,
  verifyOTP,
} from "../Controller/User";
import { validateData } from "../middleware/validation";
import { validateUserToken } from "../middleware/validation";
import {
  EditProfileSchema,
  NewPasswordSchema,
  OTPVerificationSchema,
} from "../schema/User";

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
  router.post(
    "/user/forgot-password",
    validateData({ schema: OTPVerificationSchema }),
    userForgotPassword
  );
  router.post(
    "/user/verify-OTP",
    validateData({ schema: OTPVerificationSchema }),
    verifyOTP
  );

  router.post(
    "/user/retry-sendOTP",
    validateData({ schema: OTPVerificationSchema }),
    retryOTP
  );
  router.post(
    "/user/new-password",
    validateData({ schema: NewPasswordSchema }),
    userUpdatePassword
  );
};
