// CoreMindEngine/database/connection.js

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error("Database URL is missing. Set DATABASE_URL or SUPABASE_DB_URL");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
