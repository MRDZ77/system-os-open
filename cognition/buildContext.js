import { fetchHistory } from "./fetchHistory.js";
import { filter } from "./filter.js";
import summarize from "./summarize.js";
import { getStructuredMemory } from "./memory/getStructuredMemory.js";
import db from "../CoreMindEngine/database/connection.js";

export async function buildContext(userId, message) {
  // 1. historial completo
  const history = await fetchHistory(userId);

  // 2. limpiar
  const clean = filter(history);

  // 3. últimos mensajes
  const recent = clean.slice(-10);

  // 4. resumen
  const summary = summarize(recent);

  // 5. memoria estructurada base
  const rawStructuredMemory = await getStructuredMemory(userId);

  // ======================
  // 🧠 CONTEXT GATING
  // ======================
  const text = String(message || "")
    .toLowerCase()
    .trim();

  const isCasual =
    text.length <= 12 &&
    !text.includes("proyecto") &&
    !text.includes("trabajo") &&
    !text.includes("nombre") &&
    !text.includes("llamo") &&
    !text.includes("quien");

  const isSharedContent = text.length > 200;

  // 🔥 FIX 1 (NUEVO)
  const hasOperationalState =
    rawStructuredMemory?.activeGoal ||
    rawStructuredMemory?.currentPhase ||
    rawStructuredMemory?.nextAction;

  const structuredMemory = { ...rawStructuredMemory };

  // 🔥 FIX 2 (MODIFICACIÓN EXACTA)
  const hasHistory = recent.length > 0;

  if (isSharedContent) {
    console.log("🧠 CONTEXT GATED: SHARED CONTENT");
  }

  if (isCasual && !hasOperationalState && !hasHistory) {
    delete structuredMemory.projects;
    delete structuredMemory.name;
    console.log("🧠 CONTEXT GATED: CASUAL INPUT");
  } else {
    const mentionsProjects =
      text.includes("proyecto") ||
      text.includes("proyectos") ||
      text.includes("en que trabajo") ||
      text.includes("en qué trabajo") ||
      text.includes("que trabajo tengo") ||
      text.includes("qué trabajo tengo") ||
      text.includes("trabajo en") ||
      text.includes("backend") ||
      text.includes("coremind") ||
      text.includes("eon");

    const mentionsIdentity =
      text.includes("nombre") ||
      text.includes("llamo") ||
      text.includes("quien soy");

    if (!mentionsProjects) delete structuredMemory.projects;
    if (!mentionsIdentity) delete structuredMemory.name;

    console.log("🧠 CONTEXT GATED:", structuredMemory);
  }

  // DEBUG
  console.log("🧠 STRUCTURED MEMORY (OBJETO):", structuredMemory);

  // 6. buscar archivos relevantes
  const fileRes = await db.query(
    `SELECT file_name, content FROM file_memory WHERE user_id = $1`,
    [userId],
  );

  const relevantFiles = {};
  const asksForFile =
    text.includes("archivo") ||
    text.includes("documento") ||
    text.includes("el que subí") ||
    text.includes("revisa") ||
    text.includes("analiza") ||
    text.includes("analízalo") ||
    text.includes("analízame") ||
    text.includes("opinion") ||
    text.includes("opinas") ||
    text.includes("que piensas") ||
    text.includes("qué piensas") ||
    text.includes("que guardé") ||
    text.includes("que tienes");

  for (const row of fileRes.rows) {
    const nameClean = row.file_name.replace(".js", "").replace(".txt", "");
    if (asksForFile || text.includes(nameClean)) {
      relevantFiles[row.file_name] = row.content;
    }
  }

  // 7. contexto final
  return {
    summary,
    messages: recent,
    structuredMemory,
    files: relevantFiles,
    lastUserMessage: message,
    size: clean.length,
  };
}
