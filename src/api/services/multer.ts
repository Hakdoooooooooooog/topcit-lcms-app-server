// Multer Config
import { Request, Response, NextFunction } from "express";
import Multer from "multer";
import fs from "fs";
import path from "path";

// const storage = Multer.diskStorage({
//   destination: (req, file, cb) => {
//     const topic_id = req.query.topicId;

//     if (!topic_id || isNaN(Number(topic_id)) || Number(topic_id) < 0) {
//       const dir = `./src/uploads/files/Topic ${req.body.topicId}`;

//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, {
//           recursive: true,
//         });
//       }
//       cb(null, dir);
//     } else {
//       const dir = `./src/uploads/files/Topic ${topic_id}`;

//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, {
//           recursive: true,
//         });
//       }
//       cb(null, dir);
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(
//       null,
//       file.fieldname + "-" + Date.now() + path.extname(file.originalname)
//     );
//   },
// });

const storage = Multer.memoryStorage();

export const upload = Multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype !== "application/pdf" ||
      !file.originalname.match(/\.(pdf)$/)
    ) {
      return cb(new Error("File must be a PDF"));
    } else {
      return cb(null, true);
    }
  },
});

export const uploadFile =
  (file: string) => (req: Request, res: Response, next: NextFunction) => {
    upload.single(file)(req, res, (err) => {
      if (err instanceof Multer.MulterError) {
        res.status(400).send({ message: err.message });
        return;
      } else if (err instanceof Error) {
        res.status(400).send({ message: err.message });
        return;
      }
      next();
    });
  };
