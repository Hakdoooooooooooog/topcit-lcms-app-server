// Desc: Middleware to check if user is authenticated and has admin role
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  decodeAccessToken,
  extractUserId,
  extractUserRole,
  verifyAccessToken,
} from "../services";

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
    const result = await verifyAccessToken(accessToken);

    if (result?.message === "Access token valid") {
      res.locals.userId = extractUserId(decodeAccessToken(accessToken));
      res.locals.role = extractUserRole(decodeAccessToken(accessToken));
      return next();
    }

    res.status(StatusCodes.UNAUTHORIZED).json({ message: result?.message });
  } catch (error: any) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: error?.message });
  }
};
