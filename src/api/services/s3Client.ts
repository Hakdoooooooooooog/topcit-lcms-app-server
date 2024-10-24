import { S3Client } from "@aws-sdk/client-s3";

const { BUCKET_REGION, ACCESS_KEY, SECRET_ACCESS_KEY } = process.env;

if (!ACCESS_KEY || !SECRET_ACCESS_KEY || !BUCKET_REGION) {
  throw new Error("Missing required environment variables for S3 client");
}

export const s3 = new S3Client({
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  region: BUCKET_REGION,
});
