// CoreMindEngine/modules/memory/handler.js

const db = require("../../database/connection");
const formatter = require("./formatter");

async function saveInteraction(appName, userId, role, message) {
  try {
    const query = `
      INSERT INTO interactions (app_name, user_id, role, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [appName, userId, role, message];

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error("❌ Error saving interaction:", err);
    throw err;
  }
}

async function fetchRecent(appName, userId, limit = 10) {
  try {
    const query = `
      SELECT role, message, created_at
      FROM interactions
      WHERE app_name = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT $3;
    `;

    const values = [appName, userId, limit];
    const result = await db.query(query, values);

    return formatter.formatMemory(result.rows);
  } catch (err) {
    console.error("❌ Error fetching memory:", err);
    return [];
  }
}

module.exports = {
  saveInteraction,
  fetchRecent,
};
