import db from "../CoreMindEngine/database/connection.js";

export async function fetchHistory(userId, limit = 20) {
  const result = await db.query(
    `SELECT id, user_id, role, content, created_at
     FROM devchat_memory
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows.reverse();
}
