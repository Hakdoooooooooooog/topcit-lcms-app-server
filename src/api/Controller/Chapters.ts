import { Request, Response } from "express";
import {
  createChapter,
  getChapterByChapterId,
  getChapterPDFByChapterId,
  updateChapterContentByChapterId,
  updateChapterPDFByChapterId,
} from "../db/Chapters";
import { formatPDFFilename, serializeBigInt } from "../services";
import path from "path";
import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { s3 } from "../services/s3Client";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { chapters, files, user_progress } from "@prisma/client";
import { compress } from "compress-pdf";
import fs from "fs";
import { getUserProgressByUserId } from "../db/User";

const { BUCKET_NAME, CLOUDFRONT_KEY_PAIR_ID, CLOUDFRONT_PRIVATE_KEY } =
  process.env;

export const getSubChaptersByChapterId = async (
  req: Request,
  res: Response
) => {
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
  const { userId } = req.query;
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
    const chapterFiles = await Promise.all([
      getChapterPDFByChapterId(Number(chapter_id)),
      getUserProgressByUserId(Number(userId)),
    ])
      .then((res) => {
        return {
          file: serializeBigInt(res[0]) as files,
          userProgress: serializeBigInt(res[1]) as user_progress,
        };
      })
      .catch((error) => {
        throw new Error(error);
      });

    if (!chapterFiles) {
      res.sendStatus(404);
      return;
    }

    if (
      (chapterFiles.userProgress?.curr_chap_id ?? 0) >=
      chapterFiles.file.chapter_id
    ) {
      const pdfUrl =
        "https://d3bqe2jvukr86q.cloudfront.net/" + chapterFiles.file.file_name;

      const signedUrl = getSignedUrl({
        url: pdfUrl,
        privateKey: Buffer.from(CLOUDFRONT_PRIVATE_KEY || "", "base64"),
        keyPairId: CLOUDFRONT_KEY_PAIR_ID || "",
        policy: JSON.stringify({
          Statement: [
            {
              Resource: pdfUrl,
              Condition: {
                DateLessThan: {
                  "AWS:EpochTime": Math.floor(Date.now() / 1000) + 3600,
                },
              },
            },
          ],
        }),
      });

      res.status(200).json({ url: signedUrl });
    } else {
      res.status(200).json({ url: "placeholder" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const CreateChapter = async (req: Request, res: Response) => {
  const chapterFile = req.file;
  const { topicId, chapterNum, chapterTitle, chapterDescription } = req.body;

  if (
    !topicId ||
    !chapterNum ||
    isNaN(Number(topicId)) ||
    isNaN(Number(chapterNum)) ||
    Number(topicId) < 0 ||
    Number(chapterNum) < 0
  ) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  if (
    !chapterTitle ||
    !chapterDescription ||
    typeof chapterTitle !== "string" ||
    typeof chapterDescription !== "string"
  ) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  if (!chapterFile) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    const filename = formatPDFFilename({
      chapterFile: chapterFile,
      topicId: Number(topicId),
      chapterNum: Number(chapterNum),
      path: path,
    });

    const result = await Promise.all([
      createChapter(
        Number(topicId),
        Number(chapterNum),
        chapterTitle,
        chapterDescription,
        {
          filename: filename,
          mimetype: chapterFile.mimetype,
        }
      ),
      await compress(chapterFile.buffer),
    ]).then((res) => {
      return {
        chapter: serializeBigInt(res[0]),
        compressedFile: res[1],
      };
    });

    const params: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: result.compressedFile,
      ContentType: chapterFile.mimetype,
    };

    const command = new PutObjectCommand(params);
    s3.send(command);

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
  const file = req.file;
  const chapterId = req.params.chapterId;
  const topicId = req.query.topicId;
  const { chapterTitle, chapterDescription } = req.body;

  if (
    !topicId ||
    !chapterId ||
    isNaN(Number(topicId)) ||
    Number(topicId) < 0 ||
    isNaN(Number(chapterId)) ||
    Number(chapterId) < 0
  ) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  if (
    !chapterDescription ||
    !chapterTitle ||
    typeof chapterDescription !== "string" ||
    typeof chapterTitle !== "string"
  ) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    const filename = formatPDFFilename({
      chapterFile: file,
      topicId: Number(topicId),
      chapterNum: Number(chapterId),
      path: path,
    });

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
      compress(file.buffer),
    ]).then((res) => {
      return {
        chapterPreviousPDF: serializeBigInt(res[0]) as files,
        content: serializeBigInt(res[1]) as chapters,
        file: serializeBigInt(res[2]) as files,
        compressedFileBuffer: res[3],
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
        Body: result.compressedFileBuffer,
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
