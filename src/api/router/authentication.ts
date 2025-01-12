import { Request, Response, Router } from "express";
import passport from "passport";
import { validateData } from "../middleware/validation";
import { verifyAndGenerateUserExpiredToken } from "../middleware/index";
import {
  LoginSchema,
  OTPVerificationSchema,
  RegisterSchema,
} from "../schema/User";
import {
  sendOTPRegistration,
  userLogin,
  userRegister,
} from "../Controller/User";
import { StatusCodes } from "http-status-codes";
import { getUserRefreshToken } from "../db/User";
import { setUserCookie } from "../services";

export default function authentication(router: Router) {
  router.post("/auth/login", validateData({ schema: LoginSchema }), userLogin);
  router.post(
    "/auth/register",
    validateData({ schema: RegisterSchema }),
    userRegister
  );

  router.post(
    "/auth/verifyEmail",
    validateData({ schema: OTPVerificationSchema }),
    sendOTPRegistration
  );

  router.post("/auth/verify", verifyAndGenerateUserExpiredToken);

  // Google Auth routes
  router.get("/auth/login/success", (req, res) => {
    if (req.user) {
      res
        .status(200)
        .send({ message: "Logged in successfully", user: req.user });
    } else {
      res.status(401).send({ message: "Unauthorized" });
    }
  });

  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: `${process.env.CLIENT_URL}/landing`,
    }),
    (req, res) => {
      // Ensure user is set in session
      req.session.save(async (err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect(`${process.env.CLIENT_URL}/landing`);
        }

        if (!req.user) {
          return res.redirect(`${process.env.CLIENT_URL}/landing`);
        }
        const refreshToken = await getUserRefreshToken(
          (req.user as any).studentId
        );

        setUserCookie(res, refreshToken.token, "accessToken");
        res.redirect(`${process.env.CLIENT_URL}/landing/success`);
      });
    }
  );

  router.post("/auth/logout", (req: Request, res: Response) => {
    res.clearCookie("accessToken");
    req.logout;
    res.status(StatusCodes.OK).send({ message: "Logged out successfully" });
  });
}
