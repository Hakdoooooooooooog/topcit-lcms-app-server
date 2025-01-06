import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import {
  createOTP,
  createUser,
  createUserRefreshToken,
  deleteOTP,
  getUserByEmailorID,
  getUserById,
  getUserCredentials,
  getUserDetailsByEmail,
  getUserProgressByUserId,
  getUserRefreshToken,
  getUserStoredOTP,
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
  generateOTP,
  sendOTPEmail,
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
    if (err.message === "Refresh token expired") {
      try {
        const data = await getUserCredentials(email, password);
        const newRefreshToken = await generateRefreshToken(data);

        // Update refresh token in database
        await updateUserRefreshTokenByUserID(
          Number(data.userid),
          newRefreshToken
        );

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
      } catch (error: any) {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: error.message });
      }
    } else if (err.message === "Refresh token not found") {
      try {
        const userData = await getUserCredentials(email, password);

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
      } catch (error: any) {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: error.message });
      }
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: err.message });
    }
  } finally {
    res.end();
  }
};

export const userRegister = async (req: Request, res: Response) => {
  const { username, userid, email, password, otp } = req.body;
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

    const userOTP = await getUserStoredOTP(email);

    if (!userOTP) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "OTP not found" });
      return;
    }

    if (userOTP.otp !== otp) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid OTP" });
      return;
    }

    // Delete the OTP after successful verification
    await deleteOTP(email);

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
  } finally {
    res.end();
  }
};

export const updateUserChapterProgress = async (
  req: Request,
  res: Response
) => {
  const { userId, isAuth } = req.query;
  const { chapterId, topic_id } = req.body;

  if (!userId || !chapterId || !isAuth || !topic_id) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  if (res.locals.userId !== Number(userId) || isAuth === "false") {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const progressData = await getUserProgressByUserId(Number(userId));

    if (!progressData.user_progress) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const updateProgress = await updateUserProgressByUserId(
      Number(userId),
      Number(topic_id),
      progressData.user_progress
    );

    if (!updateProgress) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error updating progress" });
      return;
    }

    const updatedProgress = await getUserProgressByUserId(Number(userId));

    if (!updatedProgress) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching updated progress" });
      return;
    }

    res.status(StatusCodes.OK).json(
      serializeBigInt({
        message: "Chapter progress updated successfully",
        curr_chap_id: updatedProgress.user_progress?.curr_chap_id,
        curr_topic_id: updatedProgress.user_progress?.curr_topic_id,
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

export const userLogout = async (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.status(StatusCodes.OK).json({ message: "Logged out" });
};

export const retryOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const newOTP = generateOTP();

    const user = await getUserByEmailorID(email);

    if (!user || !user.email) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    await sendOTPEmail(email, newOTP);
    await createOTP(user.email, Number(user.userid), newOTP);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to process OTP verification:" + error.message,
    });
  }
};

export const sendOTPRegistration = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const newOTP = generateOTP();
    await sendOTPEmail(email, newOTP);
    await createOTP(email, 0, newOTP);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to " + email,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to process OTP verification:" + error.message,
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const storedOTP = await getUserStoredOTP(email);

    if (!storedOTP) {
      res.status(404).json({
        success: false,
        message: "OTP not found",
      });
      return;
    }

    if (storedOTP.otp !== otp) {
      res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    // Delete the OTP after successful verification
    await deleteOTP(email);
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process OTP verification",
    });
  }
};

export const userForgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const userData = await getUserDetailsByEmail(email);

    if (!userData.userid) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "User not found" });
      return;
    }

    const newOTP = generateOTP();
    await createOTP(email, Number(userData.userid), newOTP);
    await sendOTPEmail(email, newOTP);

    res.status(StatusCodes.OK).json({
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  } finally {
    res.end();
  }
};

export const userUpdatePassword = async (req: Request, res: Response) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Passwords do not match" });
    return;
  }

  if (!email || !password || !confirmPassword) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Missing required fields" });
    return;
  }

  try {
    const userData = await getUserDetailsByEmail(email);

    if (!userData) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "User not found" });
      return;
    }

    const updatedData = await updateUserById(Number(userData.userid), {
      password,
      email: userData.email,
    });

    if (!updatedData) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error updating password",
      });
      return;
    }

    res.status(StatusCodes.OK).json({ message: "Password updated" });
  } catch (error: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  } finally {
    res.end();
  }
};
