import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import {
  verifyAccessToken,
  generateAuthenticatedToken,
  setUserCookie,
  decodeAccessToken,
  extractUserId,
  extractUserRole,
  checkUserRefreshTokenValidity,
} from "../services";
import { verifyAndGenerateUserExpiredToken } from ".";
import { getUserById, getUserRefreshToken } from "../db/User";

type ValidationDataProps = {
  schema: z.ZodTypeAny;
};

export function validateData({ schema }: ValidationDataProps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: any) => ({
          name: issue.path.join("."),
          messageError: issue.message,
        }));
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Invalid data", details: errorMessages });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ errors: [{ message: "Internal Server Error" }] });
      }
    }
  };
}

export const validateUserToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    res.sendStatus(StatusCodes.FORBIDDEN);
    return;
  }

  try {
    await verifyAccessToken(accessToken);
    const decodedToken = decodeAccessToken(accessToken);
    const userId = extractUserId(decodedToken);

    res.locals.userId = userId;
    next();
  } catch (error: any) {
    if (error.message === "Access token expired") {
      try {
        const userData = await getUserById(Number(req.query.userId as string));
        const refreshToken = await getUserRefreshToken(Number(userData.userid));

        await checkUserRefreshTokenValidity(
          new Date(refreshToken.expires_at),
          new Date()
        );

        const newToken = await generateAuthenticatedToken({
          userId: Number(userData.userid),
          role: userData.role,
          refreshToken: refreshToken.token,
        });

        const decodedToken = decodeAccessToken(newToken);
        const userId = extractUserId(decodedToken);

        res.locals.userId = userId;
        setUserCookie(res, accessToken, "accessToken");
        next();
      } catch (error: any) {
        if (error.message === "Refresh token expired") {
          res.status(StatusCodes.UNAUTHORIZED).json({
            message: error.message,
          });
          return;
        }

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: error.message,
        });
      }
    }
  }
};
