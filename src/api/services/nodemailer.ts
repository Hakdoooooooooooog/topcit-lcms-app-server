import nodemailer from "nodemailer";

if (!process.env.NODE_MAILER_EMAIL || !process.env.NODE_MAILER_PASSWORD) {
  throw new Error("Please set EMAIL and PASSWORD in .env file");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODE_MAILER_EMAIL,
    pass: process.env.NODE_MAILER_PASSWORD,
  },
});
export default transporter;
