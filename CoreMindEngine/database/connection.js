// CoreMindEngine/database/connection.js

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is missing in .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
