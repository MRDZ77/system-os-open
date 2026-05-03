export function detectIntent(message) {
  console.log("📥 RAW MESSAGE:", message);

  const text = message.toLowerCase().trim();

  // =========================
  // 🧠 NORMALIZACIÓN (FIX REAL)
  // =========================
  const normalized = text
    .replace(/\btrabaho\b|\btrabajando\b|\btrabjo\b/g, "trabajo")
    .replace(/\bme\s+yamo\b/g, "me llamo")
    .replace(/\bme\s+llamo\b/g, "me llamo")
    .replace(/core mind/g, "coremind");

  console.log("🧠 NORMALIZED:", normalized);

  // =========================
  // 🧠 RECALL (ROBUSTO)
  // =========================
  const isNameQuestion =
    normalized.includes("como me llamo") || normalized.includes("quien soy");

  const isWorkQuestion =
    normalized.includes("en que trabajo") ||
    normalized.includes("en que estoy trabajo") ||
    normalized.includes("donde trabajo") ||
    normalized.includes("que proyectos tengo");

  if (isNameQuestion || isWorkQuestion) {
    console.log("🧠 INTENT: RECALL");

    const intents = [];

    if (isNameQuestion) {
      intents.push({ type: "identity", action: "recall", entity: "name" });
    }

    if (isWorkQuestion) {
      intents.push({ type: "project", action: "recall", entity: "projects" });
    }

    return intents;
  }

  // =========================
  // 🧠 DETECCIÓN DE OPINIÓN (NUEVO)
  // =========================
  const isOpinion =
    normalized.includes("opinas") ||
    normalized.includes("piensas") ||
    normalized.includes("te parece");

  if (isOpinion) {
    console.log("🧠 INTENT: OPINION → AGENT REFLECT");
    return [{ type: "agent", action: "reflect" }];
  }

  // =========================
  // 🧠 BLOQUEO DE PREGUNTAS
  // =========================

  // =========================
  // 🧠 SAVE (AFIRMACIONES)
  // =========================
  if (normalized.includes("me llamo") || normalized.includes("trabajo en")) {
    console.log("🧠 INTENT: SAVE");

    const intents = [];

    // =========================
    // NAME SAVE
    // =========================
    if (normalized.includes("me llamo")) {
      intents.push({
        type: "identity",
        action: "save",
        entity: "name",
        extract: (msg) => {
          const match = msg.toLowerCase().match(/me llamo (\w+)/);
          const name = match?.[1] || null;

          console.log("🧠 EXTRACTED NAME:", name);

          return name;
        },
      });
    }

    // =========================
    // PROJECT SAVE (MEJORADO)
    // =========================
    if (normalized.includes("trabajo en")) {
      intents.push({
        type: "project",
        action: "save",
        entity: "projects",
        extract: (msg) => {
          const match = msg.toLowerCase().match(/trabajo en (.+)/);

          if (!match) return null;

          let cleaned = match[1]
            .replace(/ en /g, ",")
            .replace(/ y /g, ",")
            .replace(/[^\w,\s]/g, "");

          let projects = cleaned
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

          const blacklist = ["en", "y", "de", "la"];
          projects = projects.filter((p) => !blacklist.includes(p));

          const final = projects.join(", ");

          console.log("🚀 EXTRACTED PROJECTS CLEAN:", final);

          return final || null;
        },
      });
    }

    return intents;
  }

  // =========================
  // 🧠 FALLBACK SAVE (FIX REAL)
  // =========================
  const looksLikeWork =
    normalized.includes("trabajo") || normalized.includes("proyecto");

  if (looksLikeWork) {
    let cleaned = normalized.replace(/[^\w\s]/g, "").trim();

    console.log("🧠 FALLBACK EXTRACT:", cleaned);

    // 🔥 VALIDACIÓN ESTRUCTURAL (ANTI-BASURA)
    const isGarbage = cleaned.length < 4 || cleaned.split(" ").length > 3;

    if (isGarbage) {
      console.log("⚠️ FALLBACK CANCELLED (GENERIC PHRASE)");
      return [{ type: "conversation", action: "respond" }];
    }

    // =========================
    // 🧠 VALIDACIÓN ESTRUCTURAL (FASE 2 REAL)
    // =========================
    const words = cleaned.split(" ").filter(Boolean);

    // ❌ vacío
    if (words.length === 0) {
      console.log("⚠️ FALLBACK CANCELLED (EMPTY)");
      return [{ type: "conversation", action: "respond" }];
    }

    // ❌ muy corto
    if (cleaned.length < 3) {
      console.log("⚠️ FALLBACK CANCELLED (TOO SHORT)");
      return [{ type: "conversation", action: "respond" }];
    }

    // ❌ una sola palabra genérica
    if (words.length === 1) {
      const word = words[0];

      if (word.endsWith("o") || word.endsWith("a") || word.endsWith("e")) {
        console.log("⚠️ FALLBACK CANCELLED (GENERIC WORD)");
        return [{ type: "conversation", action: "respond" }];
      }
    }
    // ❌ FRASES GENÉRICAS (FASE 2 FINAL)
    const genericPatterns = ["trabajo", "proyecto"];

    const isGenericPhrase = genericPatterns.some((g) => cleaned.includes(g));

    // si contiene palabra genérica PERO no especifica nada más
    if (isGenericPhrase && words.length <= 2) {
      console.log("⚠️ FALLBACK CANCELLED (GENERIC PHRASE)");
      return [{ type: "conversation", action: "respond" }];
    }
    console.log("🧠 INTENT: SAVE (FALLBACK)");

    return [
      {
        type: "project",
        action: "save",
        entity: "projects",
        extract: () => cleaned,
      },
    ];
  }

  // =========================
  // 🧠 SHARED CONTENT (NUEVO)
  // =========================
  const isSharedContent =
    normalized.includes("analiza") ||
    normalized.includes("analizalo") ||
    normalized.includes("mira esto") ||
    normalized.includes("te comparto") ||
    normalized.includes("quiero compartir") ||
    normalized.includes("lee esto") ||
    text.length > 200;

  if (isSharedContent) {
    console.log("🧠 INTENT: SHARED CONTENT → ANALYZE");
    return [{ type: "content", action: "analyze" }];
  }

  // =========================
  // 🧠 DEFAULT REAL
  // =========================
  console.log("⚠️ FALLBACK");
  return [{ type: "conversation", action: "respond" }];
}
