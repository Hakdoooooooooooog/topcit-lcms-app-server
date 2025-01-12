import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors, { CorsOptions } from "cors";
import router from "./api/router";
import passport from "passport";
import "./api/services/passport";
import session from "express-session";
export const app = express();

const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const MemoryStore = require("memorystore")(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("Session secret is required");
}

// Apply CORS before other middleware
app.use(cors(corsOptions));
app.set("trust proxy", 1);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Move these after passport middleware
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/", router());

app.get("/health", (req, res) => {
  res.status(200).send({ message: "Server is running", status: 200 });
});

// Start server
if (process.env.NODE_ENV === "development") {
  app.listen(3300, () => {
    console.log("Server is running on port 3300");
  });
}

export default app;
