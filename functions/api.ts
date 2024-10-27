// File: /functions/api.ts
import serverless from "serverless-http";
import { app } from "../src";
import { Request, Response, NextFunction } from "express";
import router from "../src/api/router";

app.use("/", router());

export const handler = serverless(app);
