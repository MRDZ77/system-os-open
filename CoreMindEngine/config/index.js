// CoreMindEngine/config/index.js

require("dotenv").config();

module.exports = {
  appName: "coremind",
  openaiKey: process.env.OPENAI_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
};
