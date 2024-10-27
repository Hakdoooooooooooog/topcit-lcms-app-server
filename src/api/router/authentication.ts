import { Router } from "express";
import { validateData } from "../middleware/validation";
import { validateUserToken } from "../middleware/index";
import { LoginSchema, RegisterSchema } from "../schema/User";
import { userLogin, userRegister } from "../Controller/User";

export default function authentication(router: Router) {
  router.post(
    "/api/auth/login",
    validateData({ schema: LoginSchema }),
    userLogin
  );
  router.post(
    "/api/auth/register",
    validateData({ schema: RegisterSchema }),
    userRegister
  );
  router.post("/api/auth/verify", validateUserToken, (req, res) => {
    res.status(200).json({
      message: "Access token valid",
      userId: res.locals.userId,
      role: res.locals.role,
    });
  });
}
