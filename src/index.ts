import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors, { CorsOptions } from "cors";
import router from "./api/router";

export const app = express();

const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/", router());

export default app;
