import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import {
  createUser,
  createUserRefreshToken,
  getUserByEmailorID,
  getUserById,
  getUserCredentials,
  getUserRefreshToken,
  updateUserById,
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

    const refreshTokenData = await getUserRefreshToken(
      Number(userData[0].userID)
    );

    // Check if refresh token exists
    if (refreshTokenData === null) {
      const refreshToken = await generateRefreshToken(
        serializeBigInt(userData)
      );

      // Create refresh token in database
      const tokenData = await createUserRefreshToken(
        Number(userData[0].userID),
        refreshToken
      );

      if (!tokenData) {
        res.status(400).json({ message: "Error creating token" });
        return;
      }

      // Generate access token and set cookie
      const accessToken = await generateAuthenticatedToken({
        userId: Number(userData[0].userID),
        role: userData[0].role,
        refreshToken,
      });
      setUserCookie(res, accessToken, "accessToken");

      res.status(StatusCodes.OK).json(
        serializeBigInt({
          message: "Login successfully",
          userId: userData[0].userID,
          role: userData[0].role,
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
      userId: Number(userData[0].userID),
      role: userData[0].role,
      refreshToken: refreshTokenData.token,
    });
    setUserCookie(res, accessToken, "accessToken");

    res.status(200).json(
      serializeBigInt({
        message: "Login successfully",
        userId: userData[0].userID,
        role: userData[0].role,
      })
    );
  } catch (err: any) {
    if (err?.message === "Refresh token expired") {
      const data = await getUserCredentials(email, password);
      const newRefreshToken = await generateRefreshToken(data);

      // Update refresh token in database
      const tokenData = await updateUserRefreshTokenByUserID(
        Number(data[0].userID),
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
        userId: Number(data[0].userID),
        role: data[0].role,
        refreshToken: newRefreshToken,
      });
      setUserCookie(res, accessToken, "accessToken");

      res.status(StatusCodes.OK).json(
        serializeBigInt({
          message: "Login successfully",
          userId: data[0].userID,
          role: data[0].role,
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
  const { username, userID, email, password } = req.body;

  try {
    const userData = await getUserByEmailorID(email, Number(userID));
    if (userData.length > 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "User already exists" });
      return;
    }

    const data = await createUser({
      username,
      userID,
      email,
      password,
    });

    if (!data) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Error creating user" });
      return;
    }

    res.status(StatusCodes.OK).json({ message: "User created" });
  } catch (err: any) {
    res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
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

    if (data.length === 0) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    res.status(StatusCodes.OK).json(
      serializeBigInt({
        userID: data[0].userID,
        username: data[0].username,
        email: data[0].email,
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
    const userData = await getUserById(Number(userId));

    if (!userData) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }

    const userRefreshToken = await getUserRefreshToken(Number(userId));
    if (!userRefreshToken) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }

    const tokenValidity = await checkUserRefreshTokenValidity(
      userRefreshToken.expires_at,
      new Date()
    );

    if (tokenValidity.message === "Refresh token valid") {
      const newAccessToken = await generateAuthenticatedToken({
        userId: Number(userData[0].userID),
        role: userData[0].role,
        refreshToken: userRefreshToken.token,
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

export const userLogout = async (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.status(StatusCodes.OK).json({ message: "Logged out" });
};
