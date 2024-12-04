import serverless from "serverless-http";
import app from "../../src";

if (process.env.NODE_ENV === "development") {
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.SERVER_URL}`);
  });
}

if (process.env.NODE_ENV === "production") {
  module.exports.handler = serverless(app);
}
