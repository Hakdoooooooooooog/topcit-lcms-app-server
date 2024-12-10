import { users } from "@prisma/client";
import bcrypt from "bcryptjs";
import { format } from "date-fns-tz";
import jwt, { JwtPayload } from "jsonwebtoken";
import path from "path";

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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
