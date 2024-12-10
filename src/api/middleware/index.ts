// Desc: Middleware to check if user is authenticated and has admin role
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  checkUserRefreshTokenValidity,
  decodeAccessToken,
  generateAuthenticatedToken,
  setUserCookie,
  verifyAccessToken,
} from "../services";
import { getUserById, getUserRefreshToken } from "../db/User";

export const verifyAndGenerateUserExpiredToken = async (
  req: Request,
  res: Response
) => {
  const { userId, isAuth } = req.body;
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    res.sendStatus(StatusCodes.FORBIDDEN);
    return;
  }

  if (!userId || !isAuth) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: "Invalid data",
    });
    return;
  }

  try {
    const result = await verifyAccessToken(accessToken);
    const userRole = decodeAccessToken(accessToken).role;

    res.status(StatusCodes.OK).json({
      message: result.message,
      userData: {
        userId: userId,
        isAuth: isAuth,
        role: userRole,
      },
    });
  } catch (error: any) {
    if (error.message === "Access token expired") {
      try {
        // Get user data by userId
        const userData = await getUserById(userId);

        // Get user refresh token and check if it's still valid
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
        setUserCookie(res, newToken, "accessToken");

        res.status(StatusCodes.OK).json({
          message: "Access token refreshed",
          userData: {
            userId: userData.userid,
            isAuth: isAuth as boolean,
            role: userData.role,
          },
        });
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
