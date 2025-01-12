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
  studentId: number
): Promise<Omit<users, "id" | "created_at" | "password">> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findUnique({
      where: {
        studentId: studentId,
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
  studentId: number
): Promise<Pick<user_refresh_tokens, "id" | "token" | "expires_at">> {
  return new Promise(async (resolve, reject) => {
    const refreshToken = await prisma.user_refresh_tokens.findFirst({
      select: {
        id: true,
        token: true,
        expires_at: true,
      },
      where: {
        student_id: studentId,
      },
    });

    if (refreshToken) {
      resolve(refreshToken);
    } else {
      reject(new Error("Refresh token not found"));
    }
  });
}

export async function updateUserRefreshTokenBystudentId(
  studentId: number,
  refreshToken: string
): Promise<{ message: string }> {
  return new Promise(async (resolve, reject) => {
    const userToken = await getUserRefreshToken(studentId);
    if (!userToken) {
      return reject({ message: "Refresh token not found" });
    }

    const updateToken = await prisma.user_refresh_tokens.update({
      where: {
        id: userToken.id,
        AND: {
          student_id: studentId,
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
  studentId: number,
  refreshToken: string
): Promise<{ message: string }> {
  return new Promise(async (resolve, reject) => {
    const createToken = await prisma.user_refresh_tokens.create({
      data: {
        student_id: studentId,
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

export function getUserStoredOTP(
  email: string
): Promise<{ otp: string; expires_at: Date }> {
  return new Promise(async (resolve, reject) => {
    const OTPData = await prisma.user_otp.findFirst({
      select: {
        otp: true,
        expires_at: true,
      },
      where: {
        email: email,
      },
    });

    if (OTPData && OTPData.otp) {
      resolve({
        otp: OTPData.otp,
        expires_at: OTPData.expires_at,
      });
    } else {
      reject({ message: "OTP not found" });
    }
  });
}

export function createUser(
  user: Omit<users, "id" | "role" | "created_at">
): Promise<{ message: string; errors?: any }> {
  const { username, studentId, email, password } = user;

  return new Promise(async (resolve, reject) => {
    const hashedPassword = await hashPassword(password);

    await prisma
      .$transaction(async (tx) => {
        const firstQuiz = await tx.quiz.findFirst({
          orderBy: {
            id: "asc",
          },
        });

        if (!firstQuiz) {
          throw new Error("No quiz found in the database");
        }

        return tx.users.create({
          data: {
            username: username,
            studentId: studentId,
            email: email,
            password: hashedPassword,
            user_progress: {
              create: {
                curr_chap_id:
                  (
                    await tx.chapters.findFirst({
                      select: {
                        id: true,
                      },
                      orderBy: {
                        id: "asc",
                      },
                    })
                  )?.id ?? BigInt(1),
                curr_topic_id:
                  (
                    await tx.topics.findFirst({
                      select: {
                        id: true,
                      },
                      orderBy: {
                        id: "asc",
                      },
                    })
                  )?.id ?? BigInt(1),
                curr_quiz_id: firstQuiz.id,
                completed_lessons: 0,
                completed_quizzes: 0,
              },
            },
          },
        });
      })
      .then((_data) => {
        return resolve({ message: "User created successfully" });
      })
      .catch((err) => {
        return reject({ message: "Error creating user", errors: err });
      });
  });
}

export function createOTP(
  email: string,
  otp: string,
  studentId?: number
): Promise<{ message: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const OTPTransaction = await prisma.$transaction(async (tx) => {
        const OTPcreate = await tx.user_otp.upsert({
          where: {
            email: email,
          },
          update: {
            otp: otp,
            expires_at: new Date(Date.now() + 300000),
          },
          create: {
            email: email,
            otp: otp,
            student_id: (await tx.user_otp.count()) + 1,
            expires_at: new Date(Date.now() + 300000),
          },
        });

        return OTPcreate;
      });

      if (OTPTransaction) {
        resolve({ message: "OTP created successfully" });
      }
    } catch (error: any) {
      reject({ message: "Error creating OTP:" + error.message });
    }
  });
}

export const deleteOTP = async (
  email: string
): Promise<{ message: string }> => {
  return new Promise(async (resolve, reject) => {
    const deleteOTP = await prisma.user_otp.delete({
      where: {
        email: email,
      },
    });

    if (deleteOTP) {
      resolve({ message: "OTP deleted successfully" });
    } else {
      reject({ message: "Error deleting OTP" });
    }
  });
};

export function updateUserProgressBystudentId(
  student_id: number,
  topic_id: number,
  progress: Omit<user_progress, "id" | "student_id">
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
          student_id: student_id,
          chapter_id: progress.curr_chap_id ?? 0,
          topic_id: progress.curr_topic_id ?? 0,
          completion_status: "completed",
        },
      });

      if (!addCompletedChapter) {
        reject({ message: "Error adding completed chapter" });
      }

      const userCompletedChapterPerTopic =
        await tx.user_completed_chapters.count({
          where: {
            student_id: student_id,
            AND: {
              topic_id: progress.curr_topic_id ? progress.curr_topic_id : 0,
              completion_status: "completed",
            },
          },
        });

      if (userCompletedChapterPerTopic === totalChapters) {
        progress.curr_chap_id = BigInt(1);
        progress.curr_topic_id = BigInt(topic_id + 1);
      }

      const completedChapters = await tx.user_completed_chapters.count({
        where: {
          student_id: student_id,
          completion_status: "completed",
        },
      });

      const userProgress = await tx.user_progress.upsert({
        where: {
          student_id: student_id,
        },
        update: {
          ...progress,
          curr_chap_id: completedChapters + 1,
          curr_topic_id: progress.curr_topic_id,
          completed_lessons: completedChapters,
        },
        create: {
          student_id: student_id,
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

export function getUserProgressBystudentId(
  studentId: number
): Promise<UserProgress> {
  return new Promise(async (resolve, reject) => {
    const userProgress = await prisma.$transaction(async (tx) => {
      const userProgressSet = await tx.user_progress.upsert({
        where: {
          student_id: studentId,
        },
        update: {},
        create: {
          student_id: studentId,
        },
      });

      if (!userProgressSet) {
        reject({ message: "Error setting user progress" });
      }

      const userProgress = await tx.users.findUnique({
        where: {
          studentId: studentId,
        },
        select: {
          studentId: true,
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
  email?: string,
  studentId?: number
): Promise<{
  email?: string;
  studentId?: bigint;
}> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findFirst({
      where: {
        OR: [{ email: email }, { studentId: BigInt(studentId ?? 0) }],
      },
      select: {
        email: true,
        studentId: true,
      },
    });

    if (userData) {
      if (
        userData.email === email &&
        Number(userData.studentId) === studentId
      ) {
        resolve({ email: userData.email, studentId: userData.studentId });
      } else if (userData.email === email) {
        resolve({ email: userData.email });
      } else if (Number(userData.studentId) === studentId) {
        resolve({ studentId: userData.studentId });
      }
      resolve(userData);
    } else {
      resolve({});
    }
  });
}

export function getUserDetailsByEmail(
  email: string
): Promise<Pick<users, "studentId" | "email">> {
  return new Promise(async (resolve, reject) => {
    const userData = await prisma.users.findFirst({
      where: {
        email: email,
      },
      select: {
        studentId: true,
        email: true,
      },
    });

    if (userData) {
      resolve(userData);
    } else {
      reject(new Error("User not found"));
    }
  });
}

export function updateUserById(
  studentId: number,
  user: {
    username?: string;
    email?: string;
    password?: string;
  }
): Promise<any> {
  const { username, email, password } = user;

  return new Promise(async (resolve, reject) => {
    if (password) {
      const hashedPassword = await hashPassword(password);
      const updateUser = await prisma.users.update({
        where: {
          studentId: studentId,
        },
        data: {
          username: username,
          email: email,
          password: hashedPassword,
        },
      });

      if (updateUser) {
        resolve({ message: "User updated successfully" });
      } else {
        reject({ message: "Error updating user" });
      }
    } else {
      const updateUser = await prisma.users.update({
        where: {
          studentId: studentId,
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
    }
  });
}
