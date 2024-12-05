import serverless from "serverless-http";
import app from "../../src";

if (process.env.NODE_ENV === "production") {
  module.exports.handler = serverless(app, {
    basePath: "/api",
  });
}
