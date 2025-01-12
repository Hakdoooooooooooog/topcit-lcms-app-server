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
  getUserProgressBystudentId,
  getUserRefreshToken,
  getUserStoredOTP,
  updateUserById,
  updateUserProgressBystudentId,
  updateUserRefreshTokenBystudentId,
} from "../db/User";
import {
  generateRefreshToken,
  generateAuthenticatedToken,
  setUserCookie,
  checkUserRefreshTokenValidity,
  serializeBigInt,
  generateOTP,
  sendOTPEmail,
  checkOTPValidity,
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
      Number(userData.studentId)
    );

    await checkUserRefreshTokenValidity(
      refreshTokenData.expires_at,
      new Date()
    );

    // Generate access token and set cookie
    const accessToken = await generateAuthenticatedToken({
      studentId: Number(userData.studentId),
      role: userData.role,
      refreshToken: refreshTokenData.token,
    });
    setUserCookie(res, accessToken, "accessToken");

    res.status(200).json(
      serializeBigInt({
        message: "Login successfully",
        studentId: userData.studentId,
        role: userData.role,
      })
    );
  } catch (err: any) {
    if (err.message === "Refresh token expired") {
      try {
        const data = await getUserCredentials(email, password);
        const newRefreshToken = await generateRefreshToken(data);

        // Update refresh token in database
        await updateUserRefreshTokenBystudentId(
          Number(data.studentId),
          newRefreshToken
        );

        // Generate access token and set cookie
        const accessToken = await generateAuthenticatedToken({
          studentId: Number(data.studentId),
          role: data.role,
          refreshToken: newRefreshToken,
        });
        setUserCookie(res, accessToken, "accessToken");

        res.status(StatusCodes.OK).json(
          serializeBigInt({
            message: "Login successfully",
            studentId: data.studentId,
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
          Number(userData.studentId),
          refreshToken
        );

        if (!tokenData) {
          res.status(400).json({ message: "Error creating token" });
          return;
        }

        // Generate access token and set cookie
        const accessToken = await generateAuthenticatedToken({
          studentId: Number(userData.studentId),
          role: userData.role,
          refreshToken,
        });
        setUserCookie(res, accessToken, "accessToken");

        res.status(StatusCodes.OK).json(
          serializeBigInt({
            message: "Login successfully",
            studentId: userData.studentId,
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
  const { username, studentId, email, password, otp } = req.body;
  const errors = [];

  try {
    const userData = await getUserByEmailorID(email, Number(studentId));

    if (userData) {
      if (userData.email) {
        errors.push({ email: "Email already exists" });
      }

      if (userData.studentId) {
        errors.push({ studentId: "User ID already exists" });
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
      studentId,
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
  const { studentId, isAuth } = req.query;

  if (!isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  if (res.locals.studentId !== Number(studentId)) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const data = await getUserById(Number(studentId));

    if (!data) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    res.status(StatusCodes.OK).json(
      serializeBigInt({
        studentId: data.studentId,
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
  const { studentId, isAuth } = req.query;

  if (!isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  if (res.locals.studentId !== Number(studentId)) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const progress = await getUserProgressBystudentId(Number(studentId));

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
  const { studentId, isAuth } = req.query;

  if (!username) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  if (res.locals.studentId !== Number(studentId) || !isAuth) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const user = await getUserById(Number(studentId));

    if (!user) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const updatedData = await updateUserById(Number(studentId), {
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
  const { studentId, isAuth } = req.query;
  const { chapterId, topic_id } = req.body;

  if (!studentId || !chapterId || !isAuth || !topic_id) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }

  if (res.locals.studentId !== Number(studentId) || isAuth === "false") {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    const progressData = await getUserProgressBystudentId(Number(studentId));

    if (!progressData.user_progress) {
      res.sendStatus(StatusCodes.BAD_REQUEST);
      return;
    }

    const updateProgress = await updateUserProgressBystudentId(
      Number(studentId),
      Number(topic_id),
      progressData.user_progress
    );

    if (!updateProgress) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error updating progress" });
      return;
    }

    const updatedProgress = await getUserProgressBystudentId(Number(studentId));

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

export const retryOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const newOTP = generateOTP();

    const user = await getUserDetailsByEmail(email);

    if (!user || !user.email) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    await sendOTPEmail(email, newOTP);
    await createOTP(user.email, Number(user.studentId), newOTP);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to process OTP verification:" + error.message,
    });
  } finally {
    res.end();
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
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP:" + error.message,
    });
  } finally {
    res.end();
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const storedOTP = await getUserStoredOTP(email);

    // Delete the OTP after successful verification
    if (storedOTP.otp === otp) {
      await deleteOTP(email);
      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
      });
    }
  } catch (error: any) {
    if (error.message === "Invalid OTP") {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    } else if (error.message === "OTP expired") {
      res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to process OTP verification:" + error.message,
      });
    }
  } finally {
    res.end();
  }
};

export const userForgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const userData = await getUserDetailsByEmail(email);

    if (!userData.studentId) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "User not found" });
      return;
    }

    const newOTP = generateOTP();
    await createOTP(email, Number(userData.studentId), newOTP);
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

    const updatedData = await updateUserById(Number(userData.studentId), {
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
