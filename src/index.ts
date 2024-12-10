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

app.get("/health", (req, res) => {
  res.status(200).send({ message: "Server is running", status: 200 });
});

// Start server
if (process.env.NODE_ENV === "production") {
  app.listen(3300, () => {
    console.log("Server is running on port 3300");
  });
}

export default app;
