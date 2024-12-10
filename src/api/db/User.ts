import {
  prisma,
  user_progress,
  user_refresh_tokens,
  users,
} from "../services/prisma";
import {
  comparePassword,
  hashPassword,
  refreshTokenExpiration,
} from "../services/index";
import { UserProgress } from "../types/users";

export async function getAllUsers(): Promise<users[]> {
  return prisma.users.findMany();
}

export async function getUserCredentials(
  email: string,
  password: string
): Promise<users> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (!userData) {
      reject(new Error("Invalid username or password"));
    } else {
      const isPasswordMatch = await comparePassword(
        password,
        userData.password
      );

      if (isPasswordMatch) {
        resolve(userData);
      } else {
        reject(new Error("Invalid username or password"));
      }
    }
  });
}

export async function getUserById(
  userID: number
): Promise<Omit<users, "id" | "created_at" | "password">> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findUnique({
      where: {
        userid: userID,
      },
    });

    if (userData) {
      resolve(userData);
    } else {
      reject(new Error("User not found"));
    }
  });
}
export async function getUserRefreshToken(
  userId: number
): Promise<Pick<user_refresh_tokens, "id" | "token" | "expires_at">> {
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
      reject(new Error("Refresh token not found"));
    }
  });
}

export async function updateUserRefreshTokenByUserID(
  userId: number,
  refreshToken: string
): Promise<{ message: string }> {
  return new Promise(async (resolve, reject) => {
    const userToken = await getUserRefreshToken(userId);
    if (!userToken) {
      return reject({ message: "Refresh token not found" });
    }

    const updateToken = await prisma.user_refresh_tokens.update({
      where: {
        id: userToken.id,
        AND: {
          user_id: userId,
        },
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
      reject(new Error("Error updating refresh token"));
    }
  });
}

export function createUserRefreshToken(
  userId: number,
  refreshToken: string
): Promise<{ message: string }> {
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

export function createUser(
  user: Omit<users, "id" | "role" | "created_at">
): Promise<{ message: string; errors?: any }> {
  const { username, userid, email, password } = user;

  return new Promise(async (resolve, reject) => {
    const hashedPassword = await hashPassword(password);

    await prisma
      .$transaction([
        prisma.users.create({
          data: {
            username: username,
            userid: userid,
            email: email,
            password: hashedPassword,
          },
        }),
        prisma.user_progress.create({
          data: {
            user_id: userid,
          },
        }),
      ])
      .then((_data) => {
        return resolve({ message: "User created successfully" });
      })
      .catch((err) => {
        return reject({ message: "Error creating user", errors: err });
      });
  });
}

export function updateUserProgressByUserId(
  user_id: number,
  topic_id: number,
  progress: Omit<user_progress, "id" | "user_id">
): Promise<{ message: string }> {
  return new Promise(async (resolve, reject) => {
    const updateProgressTransaction = await prisma.$transaction(async (tx) => {
      const totalChapters = await tx.chapters.count({
        where: {
          topic_id: topic_id,
        },
      });

      if (!totalChapters) {
        reject({ message: "Topic not found" });
      }

      const addCompletedChapter = await tx.user_completed_chapters.create({
        data: {
          user_id: user_id,
          chapter_id: progress.curr_chap_id ?? 0,
          topic_id: progress.curr_topic_id ?? 0,
          completion_status: "completed",
        },
      });

      if (!addCompletedChapter) {
        reject({ message: "Error adding completed chapter" });
      }

      if (progress.curr_chap_id === totalChapters) {
        progress.curr_chap_id = 1;
        progress.curr_topic_id = BigInt(topic_id + 1);
      }

      const completedChapters = await tx.user_completed_chapters.count({
        where: {
          user_id: user_id,
          completion_status: "completed",
        },
      });

      const completedQuizzes = await tx.user_completed_quizzes.count({
        where: {
          user_id: user_id,
          AND: {
            completed_at: {
              not: undefined,
            },
          },
        },
      });

      const userProgress = await tx.user_progress.upsert({
        where: {
          user_id: user_id,
        },
        update: {
          ...progress,
          curr_chap_id: completedChapters + 1,
          curr_topic_id: progress.curr_topic_id,
          completed_lessons: completedChapters,
          completed_quizzes: completedQuizzes,
        },
        create: {
          user_id: user_id,
          ...progress,
          completed_lessons: 0,
        },
      });

      return userProgress;
    });

    if (updateProgressTransaction) {
      resolve({ message: "User progress updated successfully" });
    } else {
      reject({ message: "Error updating user progress" });
    }
  });
}

export function getUserProgressByUserId(userId: number): Promise<UserProgress> {
  return new Promise(async (resolve, reject) => {
    const userProgress = await prisma.$transaction(async (tx) => {
      const userProgressSet = await tx.user_progress.upsert({
        where: {
          user_id: userId,
        },
        update: {},
        create: {
          user_id: userId,
        },
      });

      if (!userProgressSet) {
        reject({ message: "Error setting user progress" });
      }

      const userProgress = await tx.users.findUnique({
        where: {
          userid: userId,
        },
        select: {
          userid: true,
          username: true,
          email: true,
          user_progress: {
            select: {
              curr_chap_id: true,
              curr_topic_id: true,
              curr_quiz_id: true,
              completed_lessons: true,
              completed_quizzes: true,
            },
          },
          user_completed_chapters: true,
          user_completed_quizzes: true,
        },
      });

      return userProgress;
    });

    if (userProgress) {
      resolve(userProgress);
    } else {
      reject({ message: "User progress not found" });
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
  userid: number
): Promise<{
  email?: string;
  userid?: bigint;
}> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findFirst({
      select: {
        email: true,
        userid: true,
      },
      where: {
        OR: [
          {
            email: email,
          },
          {
            userid: userid,
          },
        ],
      },
    });

    if (userData) {
      if (userData.email === email && Number(userData.userid) === userid) {
        resolve({ email: userData.email, userid: userData.userid });
      } else if (userData.email === email) {
        resolve({ email: userData.email });
      } else if (Number(userData.userid) === userid) {
        resolve({ userid: userData.userid });
      }
    } else {
      resolve({});
    }

    reject({ message: "User not found" });
  });
}

export function updateUserById(userId: number, user: any): Promise<any> {
  const { username, email } = user;

  return new Promise(async (resolve, reject) => {
    const updateUser = await prisma.users.update({
      where: {
        userid: userId,
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
