// File: /functions/api.ts
import serverless from "serverless-http";
import { app } from "../src";
import { Request, Response, NextFunction } from "express";
import router from "../src/api/router";

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.header("Content-enconding", "gzip");
  next();
});

app.use("/", router());

module.exports.handler = serverless(app);
