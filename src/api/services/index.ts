import { users } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import path from "path";
import transporter from "./nodemailer";

export const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        reject(err);
      }
      resolve(hash);
    });
  });
};

export const serializeBigInt = (data: any) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const generateRefreshToken = async (user: users): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { user: serializeBigInt(user) },
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
      (err: any, token: any) => {
        if (err) {
          reject(new Error("Error generating refresh token: " + err));
        }
        resolve(token);
      }
    );
  });
};

export const refreshTokenExpiration = () => {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
};

export const generateAuthenticatedToken = async ({
  userId,
  role,
  refreshToken,
}: {
  userId: number;
  role: string;
  refreshToken: string;
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { userId: userId, role: role, refreshToken },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m",
      },
      (err, token) => {
        if (err) {
          reject(new Error("Error generating access token:" + err));
        }
        resolve(token as string);
      }
    );
  });
};

export const checkUserRefreshTokenValidity = async (
  expires_at: Date,
  currentTime: Date
): Promise<null> => {
  return new Promise((resolve, reject) => {
    if (currentTime > expires_at) {
      reject(new Error("Refresh token expired"));
    }

    resolve(null);
  });
};

export const verifyAccessToken = async (
  accessToken: string
): Promise<{ message: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      (err) => {
        if (err) {
          reject(new Error("Access token expired"));
        }
        resolve({ message: "Access token valid" });
      }
    );
  });
};

export const decodeAccessToken = (accessToken: string): JwtPayload => {
  return jwt.decode(accessToken) as JwtPayload;
};

export const extractUserRole = (accessToken: JwtPayload) => {
  return accessToken.role;
};

export const extractUserId = (accessToken: JwtPayload) => {
  return accessToken.userId;
};

export const setUserCookie = (res: any, token: string, title: string) => {
  res.cookie(title, token, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    path: "/",
    partitioned: true,
  });
};

export const formatPDFFilename = ({
  chapterFile,
  topicId,
  chapterNum,
  path,
}: {
  chapterFile: Express.Multer.File;
  topicId: number;
  chapterNum: number;
  path: path.PlatformPath;
}) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const filename =
    chapterFile.fieldname +
    "-" +
    topicId +
    "-" +
    chapterNum +
    "-" +
    uniqueSuffix +
    path.extname(chapterFile.originalname);

  return filename;
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "TOPCIT LCMS - Email Verification OTP",
    html: `
      <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OTP Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 2px solid #15803d;
      }
      .content {
        padding: 20px;
        text-align: center;
      }
      .otp-code {
        font-size: 32px;
        font-weight: bold;
        color: #15803d;
        letter-spacing: 4px;
        margin: 20px 0;
        padding: 10px;
        background-color: #f0fdf4;
        border-radius: 4px;
      }
      .footer {
        text-align: center;
        padding: 20px;
        color: #666666;
        font-size: 12px;
      }
      .warning {
        color: #dc2626;
        font-size: 14px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="[LOGO_URL]" alt="TOPCIT LCMS Logo" height="50" />
        <h1>Email Verification</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>Your OTP (One-Time Password) for email verification is:</p>
        <div class="otp-code">${otp}</div>
        <p>This code will expire in 5 minutes.</p>
        <p class="warning">
          Do not share this code with anyone. Our team will never ask for your
          OTP.
        </p>
      </div>
      <div class="footer">
        <p>This is an automated message, please do not reply.</p>
        <p>© 2024 TOPCIT LCMS. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        reject(new Error("Error sending OTP email: " + err.message));
      }
      resolve(info);
    });
  });
};
