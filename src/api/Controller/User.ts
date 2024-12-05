import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import {
  createUser,
  createUserCompleteChapterProgress,
  createUserRefreshToken,
  getUserByEmailorID,
  getUserById,
  getUserCredentials,
  getUserProgressByUserId,
  getUserRefreshToken,
  updateUserById,
  updateUserProgressByUserId,
  updateUserRefreshTokenByUserID,
} from "../db/User";
import {
  generateRefreshToken,
  generateAuthenticatedToken,
  setUserCookie,
  checkUserRefreshTokenValidity,
  serializeBigInt,
} from "../services";

export const userLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userData = await getUserCredentials(email, password);

    if (!userData) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Invalid username or password" });
      return;
    }

    const refreshTokenData = await getUserRefreshToken(Number(userData.userid));

    // Check if refresh token exists
    if (refreshTokenData === null) {
      const refreshToken = await generateRefreshToken(
        serializeBigInt(userData)
      );

      // Create refresh token in database
      const tokenData = await createUserRefreshToken(
        Number(userData.userid),
        refreshToken
      );

      if (!tokenData) {
        res.status(400).json({ message: "Error creating token" });
        return;
      }

      // Generate access token and set cookie
      const accessToken = await generateAuthenticatedToken({
        userId: Number(userData.userid),
        role: userData.role,
        refreshToken,
      });
      setUserCookie(res, accessToken, "accessToken");

      res.status(StatusCodes.OK).json(
        serializeBigInt({
          message: "Login successfully",
          userId: userData.userid,
          role: userData.role,
        })
      );
      return;
    }

    await checkUserRefreshTokenValidity(
      refreshTokenData.expires_at,
      new Date()
    );

    // Generate access token and set cookie
    const accessToken = await generateAuthenticatedToken({
      userId: Number(userData.userid),
      role: userData.role,
      refreshToken: refreshTokenData.token,
    });
    setUserCookie(res, accessToken, "accessToken");

    res.status(200).json(
      serializeBigInt({
        message: "Login successfully",
        userId: userData.userid,
        role: userData.role,
      })
    );
  } catch (err: any) {
    if (err?.message === "Refresh token expired") {
      const data = await getUserCredentials(email, password);
      const newRefreshToken = await generateRefreshToken(data);

      // Update refresh token in database
      const tokenData = await updateUserRefreshTokenByUserID(
        Number(data.userid),
        newRefreshToken
      );

      if (!tokenData) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Error updating token" });
        return;
      }

      // Generate access token and set cookie
      const accessToken = await generateAuthenticatedToken({
        userId: Number(data.userid),
        role: data.role,
        refreshToken: newRefreshToken,
      });
      setUserCookie(res, accessToken, "accessToken");

      res.status(StatusCodes.OK).json(
        serializeBigInt({
          message: "Login successfully",
          userId: data.userid,
          role: data.role,
        })
      );
      return;
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  } finally {
    res.end();
  }
};

export const userRegister = async (req: Request, res: Response) => {
  const { username, userid, email, password } = req.body;
  const errors = [];

  try {
    const userData = await getUserByEmailorID(email, Number(userid));

    if (userData) {
      if (userData.email) {
        errors.push({ email: "Email already exists" });
      }

      if (userData.userid) {
        errors.push({ userid: "User ID already exists" });
      }
    }

    if (errors.length > 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "User already exists", errors });
      return;
    }

    const data = await createUser({
      username,
      userid,
      email,
      password,
    });

    res.status(StatusCodes.OK).json({ message: data.message });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: err.message, errors: err.errors });
  } finally {
    res.end();
  }
};

export const userData = async (req: Request, res: Response) => {
  const { userId, isAuth } = req.query;

  if (!isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  if (res.locals.userId !== Number(userId)) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const data = await getUserById(Number(userId));

    if (!data) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    res.status(StatusCodes.OK).json(
      serializeBigInt({
        userid: data.userid,
        username: data.username,
        email: data.email,
      })
    );
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: err.message });
  } finally {
    res.end();
  }
};

export const userProgressTrack = async (req: Request, res: Response) => {
  const { userId, isAuth } = req.query;

  if (!isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  if (res.locals.userId !== Number(userId)) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const progress = await getUserProgressByUserId(Number(userId));

    if (!progress) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    res.status(StatusCodes.OK).json(serializeBigInt(progress));
  } catch (error: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

export const userRefreshTokenAccess = async (req: Request, res: Response) => {
  const { userId, isAuth } = req.body;

  if (!isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  if (!userId) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  try {
    const data = await Promise.all([
      getUserById(Number(userId)),
      getUserRefreshToken(Number(userId)),
    ]).then((data) => {
      return {
        user: data[0],
        refreshToken: data[1],
      };
    });

    if (!data.user) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }

    if (!data.refreshToken) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }

    const tokenValidity = await checkUserRefreshTokenValidity(
      data.refreshToken.expires_at,
      new Date()
    );

    if (tokenValidity.message === "Refresh token valid") {
      const newAccessToken = await generateAuthenticatedToken({
        userId: Number(data.user.userid),
        role: data.user.role,
        refreshToken: data.refreshToken.token,
      });

      setUserCookie(res, newAccessToken, "accessToken");
      res.sendStatus(StatusCodes.OK);
      return;
    }

    res.sendStatus(StatusCodes.UNAUTHORIZED);
  } catch (err: any) {
    if (err.message === "Refresh token expired") {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Refresh token expired" });
    } else {
      res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  } finally {
    res.end();
  }
};

export const updateUserData = async (req: Request, res: Response) => {
  const { username } = req.body;
  const { userId, isAuth } = req.query;

  if (!username) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  if (res.locals.userId !== Number(userId) || !isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const user = await getUserById(Number(userId));

    if (!user) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const updatedData = await updateUserById(Number(userId), {
      username,
    });

    if (!updatedData) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    res.status(StatusCodes.OK).json({ message: "User updated" });
  } catch (err: any) {
    res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    console.log(err);
  } finally {
    res.end();
  }
};

export const updateUserChapterProgress = async (
  req: Request,
  res: Response
) => {
  const { userId, isAuth } = req.query;
  const { chapterId } = req.body;

  if (!userId || !chapterId || !isAuth) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  if (res.locals.userId !== Number(userId) || isAuth === "false") {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const progressData = await getUserProgressByUserId(Number(userId));

    if (!progressData) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    if (
      progressData.user_completed_chapters.some(
        (chapter) => chapter.chapter_id === BigInt(chapterId)
      )
    ) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ message: "Chapter already completed" });
      return;
    }

    if (!progressData.user_progress) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const updateProgress = await Promise.all([
      createUserCompleteChapterProgress(Number(userId), chapterId),
      updateUserProgressByUserId(Number(userId), {
        ...progressData.user_progress,
        curr_chap_id: Number(chapterId) + 1,
      }),
    ]).then((data) => {
      return {
        userProgress: data[0],
        updatedProgress: data[1],
      };
    });

    if (!updateProgress.userProgress || !updateProgress.updatedProgress) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error updating chapter progress" });
      return;
    }

    const updatedProgress = await getUserProgressByUserId(Number(userId));

    if (!updatedProgress) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching updated progress" });
      return;
    }

    res.status(StatusCodes.OK).json({
      message: "Chapter progress updated successfully",
      curr_chap_id: updatedProgress.user_progress?.curr_chap_id,
    });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: err.message });
  } finally {
    res.end();
  }
};

export const userLogout = async (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.status(StatusCodes.OK).json({ message: "Logged out" });
};
