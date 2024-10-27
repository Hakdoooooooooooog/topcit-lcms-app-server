import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors, { CorsOptions } from "cors";
import serverless from "serverless-http";
import router from "./api/router";

const app = express();
const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.header("Content-enconding", "gzip");
  next();
});

// Routes (API)
app.use("/.netlify/functions/", router());

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).send("Something broke!");
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// Serverless
module.exports.handler = serverless(app);

// Local Server
// app.listen(process.env.PORT, () => {
//   console.log(`Server is running on ${process.env.SERVER_URL}`);
// });
