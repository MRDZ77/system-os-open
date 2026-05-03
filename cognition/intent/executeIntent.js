export async function executeIntent({ intents, context, db, message }) {
  console.log("🧠 EXECUTE INTENTS:", intents);

  const { structuredMemory } = context;

  if (!intents || intents.length === 0) {
    console.log("⚠️ NO INTENTS");
    return {
      response: null,
      logs: [],
    };
  }

  const responses = new Set();
  let somethingSaved = false;

  // 🔥 FASE 4 LOGS
  let executionLog = [];

  // =========================
  // 🧱 HELPERS
  // =========================

  function normalize(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isValidValue(value) {
    if (!value) return false;

    const v = value.toLowerCase().trim();
    const blacklist = ["que", "algo", "eso", "esto", "en", "un", "una"];

    if (v.length < 2) return false;
    if (blacklist.includes(v)) return false;

    return true;
  }

  function cleanList(str) {
    return str
      ?.split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .join(", ");
  }

  function filterValidProjects(value) {
    if (!value) return [];

    const invalidWords = ["proyecto", "nuevo", "trabajo", "cosa", "algo"];

    return value
      .split(",")
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;

        const words = p.split(" ");

        if (words.length === 1 && invalidWords.includes(words[0])) {
          return false;
        }

        const allInvalid = words.every((w) => invalidWords.includes(w));
        if (allInvalid) return false;

        return true;
      });
  }

  function mergeProjects(oldValue, newValue) {
    const clean = (str) =>
      str
        ?.split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0) || [];

    const oldList = clean(oldValue);
    const newList = clean(newValue);

    const merged = [...new Set([...oldList, ...newList])];

    return merged.join(", ");
  }

  // =========================
  // 🔁 LOOP INTENTS
  // =========================

  for (const intent of intents) {
    // =========================
    // 🧠 ANALYZE CONTENT (NUEVO)
    // =========================
    if (intent.type === "content" && intent.action === "analyze") {
      console.log("🧠 ANALYZE CONTENT DETECTED");
      return {
        response: null,
        logs: [],
        passToAgent: true,
        analyzeMode: true,
      };
    }
    // =========================
    // 🧠 RECALL NAME
    // =========================
    if (intent.type === "identity" && intent.action === "recall") {
      const name = structuredMemory?.name;

      if (name) {
        responses.add(`Te llamas ${name}`);
      } else {
        responses.add("No tengo tu nombre registrado");
      }
    }

    // =========================
    // 🚀 RECALL PROJECTS
    // =========================
    if (intent.type === "project" && intent.action === "recall") {
      let projects = structuredMemory?.projects;

      if (projects) {
        projects = cleanList(projects);
        responses.add(`Trabajas en ${projects}`);
      } else {
        responses.add("No tengo registrado en qué trabajas");
      }
    }

    // =========================
    // 💾 SAVE
    // =========================
    if (intent.action === "save") {
      console.log("💾 SAVE DETECTED");

      if (intent.meta?.approved === false) {
        console.log("⚠️ BLOCKED BY MEMORY INTELLIGENCE");

        executionLog.push({
          intent: "save",
          result: "fail",
          reason: "blocked_by_intelligence",
        });

        continue;
      }

      if (intent.meta?.approved === true) {
        console.log("🧠 APPROVED:", intent.meta);
      }

      let { entity } = intent;

      let value =
        intent.value ??
        (typeof intent.extract === "function" ? intent.extract(message) : null);

      console.log("🧠 FINAL VALUE USED:", value);

      if (!value) {
        console.log("⚠️ REJECTED (EMPTY EXTRACTION)");

        executionLog.push({
          intent: "save",
          result: "fail",
          reason: "empty_extraction",
        });

        continue;
      }

      value = normalize(value);

      if (!isValidValue(value)) {
        console.log("⚠️ REJECTED (VALIDATION):", value);

        executionLog.push({
          intent: "save",
          result: "fail",
          reason: "invalid_value",
        });

        continue;
      }

      const existingValue = structuredMemory?.[entity];

      if (entity === "projects") {
        const filtered = filterValidProjects(value);

        if (filtered.length === 0) {
          console.log("⚠️ NO VALID PROJECTS → SKIPPED:", value);

          executionLog.push({
            intent: "save",
            result: "fail",
            reason: "invalid_value",
          });

          continue;
        }

        value = mergeProjects(existingValue, filtered.join(", "));
      }

      if (cleanList(existingValue) === cleanList(value)) {
        console.log("⚠️ DUPLICATE → SKIPPED");

        executionLog.push({
          intent: "save",
          result: "fail",
          reason: "duplicate",
        });

        continue;
      }

      let saved = false;

      try {
        const update = await db.query(
          `UPDATE structured_memory
           SET value = $2
           WHERE key = $1`,
          [entity, value],
        );

        if (update.rowCount === 0) {
          await db.query(
            `INSERT INTO structured_memory (key, value)
             VALUES ($1, $2)`,
            [entity, value],
          );
        }

        console.log(`✅ SAVED → ${entity}:`, value);
        saved = true;
      } catch (err) {
        console.log("❌ SAVE ERROR:", err);

        executionLog.push({
          intent: "save",
          result: "fail",
          reason: "invalid_value",
        });
      }

      if (saved) {
        somethingSaved = true;

        executionLog.push({
          intent: "save",
          result: "success",
        });
      }
    }
  }

  if (executionLog.length > 0) {
    console.log("🧠 EXECUTION LOG:", executionLog);
  }

  context.executionLog = executionLog;

  if (responses.size > 0) {
    const finalResponse = Array.from(responses).join(" y ") + ".";
    console.log("🧠 FINAL RESPONSE:", finalResponse);

    return {
      response: finalResponse,
      logs: executionLog,
    };
  }

  if (somethingSaved) {
    console.log("🧠 SAVE RESPONSE: OK");

    return {
      response: "Guardado correctamente.",
      logs: executionLog,
    };
  }

  console.log("⚠️ EXECUTE → NULL");

  return {
    response: null,
    logs: executionLog,
  };
}
