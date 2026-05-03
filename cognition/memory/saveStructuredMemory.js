import db from "../../CoreMindEngine/database/connection.js";

export async function saveStructuredMemory({
  userId,
  key,
  value,
  weight = 0.7,
}) {
  try {
    console.log("💾 DB SAVE (RAW):", { userId, key, value });

    // =========================
    // 🧠 1. GET CURRENT VALUE + LIMPIEZA
    // =========================
    const result = await db.query(
      `SELECT value FROM structured_memory 
       WHERE user_id = $1 AND key = $2`,
      [userId, key],
    );

    let current = result.rows[0]?.value;

    // 🔥 limpieza fuerte (elimina coma fantasma)
    if (current) {
      current = current
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .join(", ");
    }

    // =========================
    // 🧠 2. NORMALIZACIÓN BASE
    // =========================
    let cleanValue = String(value)
      .toLowerCase()
      .replace(/core mind/g, "coremind")
      .replace(/[^\w,\s]/g, "")
      .trim();

    // =========================
    // 🚀 3. LOGIC: FILES
    // =========================
    if (key.startsWith("file:")) {
      const fileName = key.replace("file:", "");
      await db.query(
        `INSERT INTO file_memory (user_id, file_name, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, file_name)
         DO UPDATE SET content = EXCLUDED.content`,
        [userId, fileName, value],
      );
      console.log("🧠 FILE SAVED:", fileName);
      return;
    }
    // =========================
    // 🚀 3. LOGIC: PROJECTS
    // =========================
    if (key === "projects") {
      console.log("🧠 PROJECT MODE");

      // actual → limpio
      let currentArray = current
        ? current
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
        : [];

      // nuevo → limpio
      let incomingArray = cleanValue
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // =========================
      // 🧠 FILTRO SEMÁNTICO (NO BASURA)
      // =========================
      const invalidWords = ["proyecto", "nuevo", "trabajo", "cosa", "algo"];

      incomingArray = incomingArray.filter((p) => {
        const words = p.split(" ");

        if (words.length === 1 && invalidWords.includes(words[0])) {
          return false;
        }

        const allInvalid = words.every((w) => invalidWords.includes(w));
        if (allInvalid) return false;

        return true;
      });

      // quitar basura básica
      const blacklist = ["en", "y", "de", "la"];
      incomingArray = incomingArray.filter((p) => !blacklist.includes(p));

      // =========================
      // 🚫 FIX 1: SI NO HAY NADA → SALIR
      // =========================
      if (incomingArray.length === 0) {
        console.log("⚠️ EMPTY INPUT AFTER FILTER → SKIPPED");
        return;
      }

      // =========================
      // 🚫 VALIDAR SOLO INPUT NUEVO
      // =========================
      const blacklistGlobal = ["que", "algo", "eso", "esto", "en", "un", "una"];

      const hasBadWord = incomingArray.some((p) =>
        p.split(" ").some((word) => blacklistGlobal.includes(word)),
      );

      if (hasBadWord) {
        console.log("⚠️ BLACKLIST INPUT → SKIPPED:", incomingArray);
        return;
      }

      // =========================
      // 🔀 MERGE LIMPIO
      // =========================
      const merged = [...new Set([...currentArray, ...incomingArray])]
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      cleanValue = merged.join(", ");

      console.log("🚀 MERGED PROJECTS:", cleanValue);

      // =========================
      // 🚫 FIX 2: DEFENSA FINAL VACÍO
      // =========================
      if (!cleanValue || cleanValue.trim().length === 0) {
        console.log("⚠️ EMPTY CLEAN VALUE → SKIPPED");
        return;
      }
    }

    // =========================
    // 🚫 VALIDACIÓN BÁSICA
    // =========================
    if (!cleanValue || cleanValue.length < 2) {
      console.log("⚠️ INVALID → SKIPPED:", cleanValue);
      return;
    }

    // 🔥 limpieza final defensiva
    cleanValue = cleanValue
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .join(", ");

    // =========================
    // 🚫 DUPLICADO REAL
    // =========================
    const normalizeList = (str) =>
      str
        ?.split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .sort()
        .join(",");

    if (normalizeList(current) === normalizeList(cleanValue)) {
      console.log("⚠️ DUPLICATE → SKIPPED");
      return;
    }

    // =========================
    // 🧠 4. SAVE FINAL
    // =========================
    await db.query(
      `INSERT INTO structured_memory (user_id, key, value, weight)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, key)
       DO UPDATE SET
         value = EXCLUDED.value,
         weight = EXCLUDED.weight`,
      [userId, key, cleanValue, weight],
    );

    console.log("🧠 saved memory:", key, cleanValue);
  } catch (err) {
    console.error("SAVE STRUCTURED MEMORY ERROR:", err);
  }
}
