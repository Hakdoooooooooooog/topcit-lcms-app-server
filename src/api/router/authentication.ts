import { Router } from "express";
import { validateData } from "../middleware/validation";
import { verifyAndGenerateUserExpiredToken } from "../middleware/index";
import { LoginSchema, RegisterSchema } from "../schema/User";
import { userLogin, userRegister } from "../Controller/User";

export default function authentication(router: Router) {
  router.post("/auth/login", validateData({ schema: LoginSchema }), userLogin);
  router.post(
    "/auth/register",
    validateData({ schema: RegisterSchema }),
    userRegister
  );

  router.post("/auth/verify", verifyAndGenerateUserExpiredToken);
}
