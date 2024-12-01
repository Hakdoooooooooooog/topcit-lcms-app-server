import { S3Client } from "@aws-sdk/client-s3";

const {
  BUCKET_REGION,
  ACCESS_KEY,
  SECRET_ACCESS_KEY,
  BUCKET_NAME,
  CLOUDFRONT_PRIVATE_KEY,
  CLOUDFRONT_KEY_PAIR_ID,
} = process.env;

if (
  !ACCESS_KEY ||
  !SECRET_ACCESS_KEY ||
  !BUCKET_REGION ||
  !BUCKET_NAME ||
  !CLOUDFRONT_PRIVATE_KEY ||
  !CLOUDFRONT_KEY_PAIR_ID
) {
  throw new Error("Missing required environment variables for S3 client");
}

export const s3 = new S3Client({
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  region: BUCKET_REGION,
});
