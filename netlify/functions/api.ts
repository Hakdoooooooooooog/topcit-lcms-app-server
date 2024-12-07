import serverless from "serverless-http";
import app from "../../src";

module.exports.handler = serverless(app, {
  basePath: "/api",
});
