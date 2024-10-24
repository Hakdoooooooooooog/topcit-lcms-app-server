import { z } from "zod";

const UserSchema = z.object({
  userID: z.string().regex(/^202\d{6}$/, "Invalid user ID"),
  username: z
    .string()
    .min(3, "First name must be at least 3 characters long")
    .max(20, "First name must be at most 20 characters long"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
});

export const LoginSchema = UserSchema.pick({
  email: true,
  password: true,
});

export const RegisterSchema = UserSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export const EditProfileSchema = UserSchema.pick({
  username: true,
});
