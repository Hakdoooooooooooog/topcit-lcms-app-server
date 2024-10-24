import { prisma, user_refresh_tokens, users } from "../services/prisma";
import {
  comparePassword,
  hashPassword,
  refreshTokenExpiration,
} from "../services/index";

export async function getAllUsers(): Promise<users[]> {
  return prisma.users.findMany();
}

export async function getUserCredentials(
  email: string,
  password: string
): Promise<users[]> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findMany({
      where: {
        email: email,
      },
    });

    if (userData.length === 0) {
      reject({ message: "Invalid username or password" });
    } else {
      const isPasswordMatch = await comparePassword(
        password,
        userData[0].password
      );

      if (isPasswordMatch) {
        resolve(userData);
      } else {
        reject({ message: "Invalid username or password" });
      }
    }
  });
}

export async function getUserById(userID: number): Promise<users[]> {
  return prisma.users.findMany({
    where: {
      userID: userID,
    },
  });
}
export async function getUserRefreshToken(
  userId: number
): Promise<Pick<user_refresh_tokens, "id" | "token" | "expires_at"> | null> {
  return new Promise(async (resolve, reject) => {
    const refreshToken = await prisma.user_refresh_tokens.findFirst({
      select: {
        id: true,
        token: true,
        expires_at: true,
      },
      where: {
        user_id: userId,
      },
    });

    if (refreshToken) {
      resolve(refreshToken);
    } else {
      resolve(null);
    }
  });
}

export async function updateUserRefreshTokenByUserID(
  userId: number,
  refreshToken: string
): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const userToken = await getUserRefreshToken(userId);
    if (!userToken) {
      reject({ message: "Refresh token not found" });
    }

    const updateToken = await prisma.user_refresh_tokens.update({
      where: {
        id: userToken?.id,
      },
      data: {
        token: refreshToken,
        created_at: new Date(),
        expires_at: refreshTokenExpiration(),
      },
    });

    if (updateToken) {
      resolve({ message: "Refresh token updated successfully" });
    } else {
      reject({ message: "Error updating refresh token" });
    }
  });
}

export function createUserRefreshToken(
  userId: number,
  refreshToken: string
): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const createToken = await prisma.user_refresh_tokens.create({
      data: {
        user_id: userId,
        token: refreshToken,
        expires_at: refreshTokenExpiration(),
      },
    });

    if (createToken) {
      resolve({ message: "Refresh token created successfully" });
    } else {
      reject({ message: "Error creating refresh token" });
    }
  });
}

export function createUser(user: any): Promise<any> {
  const { username, userID, email, password } = user;

  return new Promise(async (resolve, reject) => {
    const hashedPassword = await hashPassword(password);

    const createUser = await prisma.users.create({
      data: {
        username: username,
        userID: Number(userID),
        email: email,
        password: hashedPassword,
      },
    });

    if (createUser) {
      resolve({ message: "User created successfully" });
    } else {
      reject({ message: "Error creating user" });
    }
  });
}

export function getUserByEmail(email: string): Promise<users[]> {
  return prisma.users.findMany({
    where: {
      email: email,
    },
  });
}

export function getUserByEmailorID(
  email: string,
  userID: number
): Promise<users[]> {
  return prisma.users.findMany({
    where: {
      OR: [{ email: email }, { userID: userID }],
    },
  });
}

export function updateUserById(userId: number, user: any): Promise<any> {
  const { username, email } = user;

  return new Promise(async (resolve, reject) => {
    const updateUser = await prisma.users.update({
      where: {
        userID: userId,
      },
      data: {
        username: username,
        email: email,
      },
    });

    if (updateUser) {
      resolve({ message: "User updated successfully" });
    } else {
      reject({ message: "Error updating user" });
    }
  });
}
