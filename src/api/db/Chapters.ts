import { prisma, chapters, files } from "../services/prisma";

export const getChapterByChapterId = async (
  chapter_id: number
): Promise<chapters[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.chapters.findMany({
        where: {
          parent_chapter_id: chapter_id,
        },
      });
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Chapter not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getChapterPDFByChapterId = async (
  chapter_id: number
): Promise<files> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapterFiles = await prisma.files.findFirst({
        where: {
          chapter_id: chapter_id,
        },
      });

      if (chapterFiles) {
        resolve(chapterFiles);
      } else {
        reject(new Error("Chapter not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const createChapter = async (
  topicId: number,
  chapterNum: number,
  title: string,
  subtitle: string,
  file: { filename: string; mimetype: string }
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await prisma.chapters.create({
        data: {
          topic_id: topicId,
          chapter_number: chapterNum.toString(),
          title: title,
          sub_title: subtitle,
          FileChapter: {
            create: {
              file_name: file.filename,
              file_type: file.mimetype,
            },
          },
        },
      });

      if (res) {
        resolve(res);
      } else {
        reject("Error creating chapter");
      }
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const updateChapterContentByChapterId = async (
  chapter_id: number,
  title: string,
  subtitle: string
): Promise<chapters> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapter = await prisma.chapters.update({
        where: {
          id: chapter_id,
        },
        data: {
          title: title,
          sub_title: subtitle,
        },
      });

      if (chapter) {
        resolve(chapter);
      } else {
        reject(new Error("Chapter not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateChapterPDFByChapterId = async (
  chapter_id: number,
  file: { filename: string; mimetype: string }
): Promise<files> => {
  return new Promise(async (resolve, reject) => {
    try {
      const chapterFiles = await prisma.files.update({
        where: {
          chapter_id: chapter_id,
        },
        data: {
          file_name: file.filename,
          file_type: file.mimetype,
        },
      });

      if (chapterFiles) {
        resolve(chapterFiles);
      } else {
        reject(new Error("Chapter not found"));
      }
    } catch (error) {
      reject(error);
    }
  });
};
