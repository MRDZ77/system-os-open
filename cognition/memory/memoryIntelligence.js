export function memoryIntelligence({ message, intents, context }) {
  console.log("🧠 MEMORY INTELLIGENCE");

  const text = message.toLowerCase().trim();
  const memory = context?.structuredMemory || {};

  let enhanced = [...(intents || [])];

  function findSaveIndex() {
    return enhanced.findIndex(
      (i) => i.type === "project" && i.action === "save",
    );
  }

  // =========================
  // 🧠 SCORING
  // =========================

  function scoreMemory(value, type) {
    let score = 0;

    if (!value) return 0;

    // base calidad
    if (value.length > 2) score += 0.2;

    // tipo
    if (type === "identity") score += 0.9;
    if (type === "project") score += 0.5;

    // contexto técnico
    if (value.includes("backend") || value.includes("api")) score += 0.2;

    // multi palabra (más contexto)
    if (value.split(" ").length > 1) score += 0.2;

    return Number(score.toFixed(2));
  }

  // =========================
  // 🧠 PRIORIDAD REAL
  // =========================

  function getPriority(type) {
    if (type === "identity") return "high";
    if (type === "project") return "medium";
    return "low";
  }

  // =========================
  // 🧠 CONTEXTO SEMÁNTICO
  // =========================

  function isStrongStatement(text) {
    return (
      text.includes("trabajo en") ||
      text.includes("trabajando en") ||
      text.includes("estoy en") ||
      text.includes("hago")
    );
  }

  function isWeakStatement(text) {
    return (
      text.includes("me gusta") ||
      text.includes("creo que") ||
      text.includes("quiero") ||
      text.includes("tal vez")
    );
  }

  // =========================
  // 🧠 DECISIÓN FINAL
  // =========================

  function shouldSave(value, type) {
    const score = scoreMemory(value, type);
    const priority = getPriority(type);

    console.log("🧠 SCORE:", score, "| PRIORITY:", priority);

    // 🔥 bloqueo por semántica
    if (isWeakStatement(text)) {
      console.log("⚠️ BLOCKED: weak statement");
      return false;
    }

    // 🔥 validación fuerte
    if (!isStrongStatement(text)) {
      console.log("⚠️ BLOCKED: no strong signal");
      return false;
    }

    // 🔥 decisión por prioridad + score
    if (priority === "high") return score > 0.3;
    if (priority === "medium") return score >= 0.5;
    return score >= 0.85;
  }

  // =========================
  // 🔍 DETECTORES
  // =========================

  const hasWorkSignal =
    text.includes("trabajo") ||
    text.includes("trabajando") ||
    text.includes("proyecto");

  const hasImplicitSignal =
    text.includes("tambien") ||
    text.includes("nuevo") ||
    text.includes("ahora") ||
    text.includes("actualmente");

  const looksLikeStatement =
    !text.includes("?") &&
    !text.startsWith("que") &&
    !text.startsWith("por que") &&
    !text.startsWith("como") &&
    !text.startsWith("donde");

  // =========================
  // 🧠 DETECCIÓN IMPLÍCITA
  // =========================

  if (
    hasWorkSignal &&
    looksLikeStatement &&
    (hasImplicitSignal || isStrongStatement(text))
  ) {
    console.log("🧠 IMPLICIT MEMORY DETECTED");

    const existingSaveIndex = findSaveIndex();
    let extracted = extractProject(text);

    if (extracted && shouldSave(extracted, "project")) {
      const meta = {
        approved: true,
        score: scoreMemory(extracted, "project"),
        priority: getPriority("project"),
      };

      if (existingSaveIndex !== -1) {
        enhanced[existingSaveIndex] = {
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        };

        console.log("🧠 REPLACED + APPROVED:", extracted, meta);
      } else {
        enhanced.push({
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        });

        console.log("🧠 GENERATED + APPROVED:", extracted, meta);
      }
    } else {
      console.log("⚠️ REJECTED BY SCORING:", extracted);

      const meta = {
        approved: false,
        reason: "low_score",
      };

      if (existingSaveIndex !== -1) {
        enhanced[existingSaveIndex] = {
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        };
      } else {
        enhanced.push({
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        });
      }
    }
  }

  // =========================
  // 🧠 FALLBACK
  // =========================

  if (text.includes("tengo") && text.includes("trabajo")) {
    console.log("🧠 SOFT DETECTION");

    const existingSaveIndex = findSaveIndex();
    let extracted = extractProject(text);

    if (extracted && shouldSave(extracted, "project")) {
      const meta = {
        approved: true,
        score: scoreMemory(extracted, "project"),
        priority: getPriority("project"),
      };

      if (existingSaveIndex !== -1) {
        enhanced[existingSaveIndex] = {
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        };
      } else {
        enhanced.push({
          type: "project",
          action: "save",
          entity: "projects",
          value: extracted,
          meta,
        });
      }

      console.log("🧠 FALLBACK APPROVED:", extracted, meta);
    }
  }

  return enhanced;
}

// =========================
// 🧠 EXTRACTOR (SIN CAMBIOS FUERTES)
// =========================

function extractProject(text) {
  let cleaned = text
    .replace(/trabajo en/g, "")
    .replace(/trabajando en/g, "")
    .replace(/trabajo de/g, "")
    .replace(/tengo un nuevo trabajo/g, "")
    .replace(/tengo un trabajo/g, "")
    .replace(/tengo trabajo/g, "")
    .replace(/tengo un proyecto/g, "")
    .replace(/tengo proyecto/g, "")
    .replace(/nuevo/g, "")
    .replace(/tambien/g, "")
    .replace(/ahora/g, "")
    .replace(/actualmente/g, "")
    .trim();

  cleaned = cleaned
    .replace(/ y /g, ",")
    .replace(/ en /g, ",")
    .replace(/[^\w,\s]/g, "");

  let parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const blacklist = [
    "trabajo",
    "proyecto",
    "cosa",
    "algo",
    "sabes",
    "tengo",
    "nuevo",
    "ahora",
    "actualmente",
  ];

  parts = parts.filter((p) => !blacklist.includes(p));

  parts = parts.map((p) => {
    let cleaned = p
      .replace(/\btrabajo\b/g, "")
      .replace(/\bde\b/g, "")
      .trim();

    // 🔥 FIX FASE 3 → quitar artículos basura
    const articles = ["una", "un", "el", "la"];
    cleaned = cleaned
      .split(" ")
      .filter((w) => !articles.includes(w))
      .join(" ")
      .trim();

    return cleaned;
  });

  parts = parts.filter((p) => p.length > 0);

  const result = parts.join(", ").trim();

  if (!result || result.length < 2) return null;

  return result;
}
