import { topics, prisma } from "../services/prisma";
import { ChaptersWithSubChaptersWithinTopic } from "../types/topics";

export const getAllTopics = async (): Promise<topics[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const topics = await prisma.topics.findMany({
        orderBy: {
          id: "asc",
        },
      });

      if (topics) {
        resolve(topics);
      } else {
        reject({ error: "No topics found" });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getAllTopicsWithChapters = async (): Promise<
  ChaptersWithSubChaptersWithinTopic[]
> => {
  return new Promise(async (resolve, reject) => {
    try {
      const topics = await prisma.topics.findMany({
        include: {
          chapters: {
            include: {
              SubChapters: true,
              FileChapter: {
                select: {
                  file_name: true,
                },
              },
            },

            orderBy: {
              id: "asc",
            },
          },
        },

        orderBy: {
          id: "asc",
        },
      });

      if (topics) {
        resolve(topics);
      } else {
        reject({ error: "No topics found" });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const createTopic = async (
  topicName: string,
  topicDescription: string
): Promise<topics> => {
  return new Promise(async (resolve, reject) => {
    try {
      const topic = await prisma.topics.create({
        data: {
          topictitle: topicName,
          description: topicDescription,
        },
      });

      if (topic) {
        resolve(topic);
      } else {
        reject({ error: "Failed to create topic." });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateTopic = async (
  topicId: number,
  topicTitle: string,
  description: string
): Promise<topics> => {
  return new Promise(async (resolve, reject) => {
    try {
      const topic = await prisma.topics.update({
        where: {
          id: topicId,
        },
        data: {
          topictitle: topicTitle,
          description: description,
        },
      });

      if (topic) {
        resolve(topic);
      } else {
        reject({ error: "Failed to update topic." });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const checkTopicExists = async (topicId: number): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      const topic = await prisma.topics.findUnique({
        where: {
          id: topicId,
        },
      });

      if (topic) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
};
