import db from "../../CoreMindEngine/database/connection.js";

export async function getSystemState(userId) {
  try {
    // memoria estructurada
    const memRes = await db.query(
      `SELECT key, value FROM structured_memory WHERE user_id = $1`,
      [userId],
    );

    const memory = {};
    for (const row of memRes.rows) {
      if (row.key.startsWith("file:")) continue;
      memory[row.key] = row.value;
    }

    // archivos en memoria
    const fileRes = await db.query(
      `SELECT file_name FROM file_memory WHERE user_id = $1`,
      [userId],
    );

    const files = fileRes.rows.map((r) => r.file_name);

    // estado final
    return {
      usuario: memory.name || "desconocido",
      proyectos: memory.projects || "ninguno",
      archivosEnMemoria: files,
      totalArchivos: files.length,
      fecha: new Date().toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
      }),
    };
  } catch (err) {
    console.error("❌ GET SYSTEM STATE ERROR:", err);
    return null;
  }
}
