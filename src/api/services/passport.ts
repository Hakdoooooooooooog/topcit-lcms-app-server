import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma";
import { getUserRefreshToken } from "../db/User";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google client ID and secret are required");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await prisma.users.findFirst({
          where: { email: profile.emails?.[0].value },
        });

        if (!user) {
          throw new Error("User not found");
        }

        done(null, {
          studentId: Number(user.studentId),
          role: user.role,
        });
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  // Serialize only necessary data
  done(null, user);
});

passport.deserializeUser((serializedUser: any, done) => {
  // Return the serialized user directly since we already have all needed data
  done(null, serializedUser);
});
