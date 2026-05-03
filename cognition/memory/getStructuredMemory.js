import db from "../../CoreMindEngine/database/connection.js";

export async function getStructuredMemory(userId) {
  try {
    const res = await db.query(
      `SELECT key, value
       FROM structured_memory
       WHERE user_id = $1
       ORDER BY weight DESC
       LIMIT 20`,
      [userId],
    );

    // 🔥 LOG CRUDO DB
    console.log("📥 RAW DB STRUCTURED:", res.rows);

    // 🔧 CONSTRUIR OBJETO
    const map = {};

    for (const row of res.rows) {
      if (!row.key) continue;
      if (row.key.startsWith("file:")) continue;

      const cleanKey = String(row.key).trim();
      const cleanValue = row.value ? String(row.value).trim() : null;

      map[cleanKey] = cleanValue;
    }

    // 🔥 LOG OBJETO FINAL
    console.log("🧠 STRUCTURED MAP:", map);

    // 🔥 VALIDACIÓN CRÍTICA
    if (!map || Object.keys(map).length === 0) {
      console.log("⚠️ STRUCTURED MEMORY VACÍA");
    }

    return map;
  } catch (err) {
    console.error("❌ GET STRUCTURED MEMORY ERROR:", err);
    return {};
  }
}
