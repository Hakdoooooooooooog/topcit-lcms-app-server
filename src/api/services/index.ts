import { users } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";

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

export const generateRefreshToken = async (user: users[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { user: user },
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
      (err: any, token: any) => {
        if (err) {
          reject(err);
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
          reject({ message: "Error generating access token" });
        }
        resolve(token as string);
      }
    );
  });
};

export const checkUserRefreshTokenValidity = async (
  expires_at: Date,
  currentTime: Date
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (currentTime > expires_at) {
      reject({ message: "Refresh token expired" });
    }

    resolve({ message: "Refresh token valid" });
  });
};

export const verifyAccessToken = async (accessToken: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      (err) => {
        if (err) {
          reject({ message: "Access token expired" });
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
    domain: "topcitlcms.netlify.app",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};
