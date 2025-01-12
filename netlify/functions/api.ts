import serverless from "serverless-http";
import app from "../../src";

if (process.env.NODE_ENV === "deployment") {
  module.exports.handler = serverless(app, {
    basePath: "/api",
  });
}
