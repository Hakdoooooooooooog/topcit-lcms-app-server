import {
  user_completed_chapters,
  user_completed_quizzes,
  user_progress,
  users,
} from "../services/prisma";

export type UserProgress = Pick<users, "userid" | "email"> & {
  user_progress: Omit<user_progress, "id" | "user_id"> | null;
  user_completed_chapters: user_completed_chapters[];
};

export type UserProgressData = {
  Topics: {
    id: bigint;
    topictitle: string | null;
    description: string | null;
    chapters: {
      id: bigint;
      title: string | null;
      sub_title: string | null;
    }[];
  }[];
  userProgress:
    | (Pick<users, "userid" | "username"> & {
        user_progress: Omit<user_progress, "id" | "user_id"> | null;
        user_completed_chapters: user_completed_chapters[];
      })
    | null;
  userCompletedQuizzes: user_completed_quizzes[];
};
