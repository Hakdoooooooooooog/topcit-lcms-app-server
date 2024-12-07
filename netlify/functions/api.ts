import serverless from "serverless-http";
import app from "../../src";

if (process.env.NODE_ENV === "development") {
  module.exports.handler = serverless(app, {
    basePath: "/api",
  });
}
