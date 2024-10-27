import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors, { CorsOptions } from "cors";

export const app = express();

// Middleware
app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [process.env.CLIENT_URL];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    cors({
      origin: origin,
      credentials: true,
    });
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Encoding", "gzip");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  next();
});
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
