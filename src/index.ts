import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors, { CorsOptions } from "cors";

export const app = express();
const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

// Route (API) for Express
// app.use("/", router());

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).send("Something broke!");
});

// Local Server
// app.listen(process.env.PORT, () => {
//   console.log(`Server is running on ${process.env.SERVER_URL}`);
// });
