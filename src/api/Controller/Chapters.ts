import { Request, Response } from "express";
import {
  createChapter,
  getChapterByChapterId,
  getChapterPDFByChapterId,
  updateChapterContentByChapterId,
  updateChapterPDFByChapterId,
} from "../db/Chapters";
import { serializeBigInt } from "../services";
import path from "path";
import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../services/s3Client";
import { chapters, files } from "@prisma/client";

const { BUCKET_NAME } = process.env;

export const getChaptersByChapterId = async (req: Request, res: Response) => {
  const parent_chapter_id = req.params.parent_chapter_id;

  if (
    !parent_chapter_id ||
    isNaN(Number(parent_chapter_id)) ||
    Number(parent_chapter_id) < 0
  ) {
    res.sendStatus(400);
    return;
  }

  try {
    const chapters = await getChapterByChapterId(Number(parent_chapter_id));

    res.status(200).json(serializeBigInt(chapters));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  } finally {
    res.end();
  }
};

export const getChapterFilesByChapterId = async (
  req: Request,
  res: Response
) => {
  const chapter_id = req.params.chapter_id;
  const topic_id = req.query.topic_id;

  if (!chapter_id || isNaN(Number(chapter_id)) || Number(chapter_id) < 0) {
    res.sendStatus(400);
    return;
  }

  if (!topic_id || isNaN(Number(topic_id)) || Number(topic_id) < 0) {
    res.sendStatus(400);
    return;
  }

  try {
    const chapterFiles = await getChapterPDFByChapterId(Number(chapter_id));

    const PDFUrl =
      "https://d3bqe2jvukr86q.cloudfront.net/" + chapterFiles.file_name;

    if (!chapterFiles) {
      res.sendStatus(404);
      return;
    }

    res.status(200).json({ url: PDFUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const CreateChapter = async (req: Request, res: Response) => {
  const file = req.file;
  const { topicId, chapterNum, chapterTitle, chapterDescription } = req.body;

  if (
    !topicId ||
    !chapterNum ||
    isNaN(Number(topicId)) ||
    isNaN(Number(chapterNum)) ||
    Number(topicId) < 0 ||
    Number(chapterNum) < 0
  ) {
    res.sendStatus(400);
    return;
  }

  if (
    !chapterTitle ||
    !chapterDescription ||
    typeof chapterTitle !== "string" ||
    typeof chapterDescription !== "string"
  ) {
    res.sendStatus(400);
    return;
  }

  if (!file) {
    res.sendStatus(400);
    return;
  }

  try {
    const filename =
      file.fieldname + "-" + Date.now() + path.extname(file.originalname);

    const params: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const result = await Promise.all([
      createChapter(
        Number(topicId),
        Number(chapterNum),
        chapterTitle,
        chapterDescription,
        {
          filename: filename,
          mimetype: file.mimetype,
        }
      ),
      s3.send(command),
    ]).then((res) => {
      return {
        chapter: serializeBigInt(res[1]),
        s3: res[0],
      };
    });

    if (!result.chapter) {
      res.sendStatus(404);
      return;
    }

    res.status(200).json({ message: "Chapter created" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  } finally {
    res.end();
  }
};

export const updateChapter = async (req: Request, res: Response) => {
  const topicId = req.query.topicId;
  const file = req.file;
  const chapterId = req.params.chapterId;
  const { chapterTitle, chapterDescription } = req.body;

  if (
    !topicId ||
    !chapterId ||
    isNaN(Number(topicId)) ||
    Number(topicId) < 0 ||
    isNaN(Number(chapterId)) ||
    Number(chapterId) < 0
  ) {
    res.sendStatus(400);
    return;
  }

  if (
    !chapterDescription ||
    !chapterTitle ||
    typeof chapterDescription !== "string" ||
    typeof chapterTitle !== "string"
  ) {
    res.sendStatus(400);
    return;
  }

  if (!file) {
    res.sendStatus(400);
    return;
  }

  try {
    const filename =
      file.fieldname + "-" + Date.now() + path.extname(file.originalname);

    const result = await Promise.all([
      getChapterPDFByChapterId(Number(chapterId)),
      updateChapterContentByChapterId(
        Number(chapterId),
        chapterTitle,
        chapterDescription
      ),
      updateChapterPDFByChapterId(Number(chapterId), {
        filename: filename,
        mimetype: file.mimetype,
      }),
    ]).then((res) => {
      return {
        chapterPreviousPDF: serializeBigInt(res[0]) as files,
        content: serializeBigInt(res[1]) as chapters,
        file: serializeBigInt(res[2]) as files,
      };
    });

    if (!result.content) {
      res.sendStatus(404);
      return;
    }

    if (result.chapterPreviousPDF) {
      const params: DeleteObjectCommandInput = {
        Bucket: BUCKET_NAME,
        Key: result.chapterPreviousPDF.file_name,
      };
      const command = new DeleteObjectCommand(params);

      const params2: PutObjectCommandInput = {
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      const command2 = new PutObjectCommand(params2);

      const resultCommand = await Promise.all([
        s3.send(command2),
        s3.send(command),
      ]).then((res) => {
        return {
          upload: res[0],
          delete: res[1],
        };
      });

      if (!resultCommand.delete || !resultCommand.upload) {
        res.sendStatus(404);
        return;
      }
    }

    res.status(200).json({ message: "Chapter updated" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
