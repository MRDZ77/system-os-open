let errorMemory = {};

export function executionInspector(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return null;
  }

  // =========================
  // 🔍 CLASIFICAR RESULTADOS
  // =========================
  const blocked = logs.filter((l) => l.reason === "blocked_by_intelligence");
  const failures = logs.filter(
    (l) => l.result === "fail" && l.reason !== "blocked_by_intelligence",
  );
  const successes = logs.filter((l) => l.result === "success");

  // =========================
  // 🧠 PRIORIDAD 1: BLOQUEOS DELIBERADOS
  // =========================
  if (blocked.length > 0) {
    const issue = "blocked_by_intelligence";

    errorMemory[issue] = (errorMemory[issue] || 0) + blocked.length;
    const total = errorMemory[issue];
    const recurring = total >= 3;

    return {
      issue,
      count: blocked.length,
      total,
      recurring,
      type: "blocked_decision",
      suggestion: suggestFix(issue, recurring),
      source: {
        file: "memoryIntelligence.js",
        function: "scoreMemoryCandidate",
      },
    };
  }

  // =========================
  // 🧠 PRIORIDAD 2: FALLAS REALES
  // =========================
  if (failures.length > 0) {
    const reasons = {};

    for (const f of failures) {
      if (!f.reason) continue;
      reasons[f.reason] = (reasons[f.reason] || 0) + 1;
    }

    const sorted = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;

    const [topReason, count] = sorted[0];

    errorMemory[topReason] = (errorMemory[topReason] || 0) + count;
    const total = errorMemory[topReason];
    const recurring = total >= 3;

    return {
      issue: topReason,
      count,
      total,
      recurring,
      type: "technical_failure",
      suggestion: suggestFix(topReason, recurring),
      source: mapSource(topReason),
    };
  }

  // =========================
  // 🧠 PRIORIDAD 3: ÉXITO
  // =========================
  if (successes.length > 0) {
    return {
      issue: "success",
      count: successes.length,
      total: successes.length,
      recurring: successes.length >= 3,
      type: "success",
      suggestion: null,
      source: null,
    };
  }

  return null;
}

// =========================
// 🧠 MAP SOURCE
// =========================
function mapSource(reason) {
  switch (reason) {
    case "empty_extraction":
      return {
        file: "detectIntent.js",
        function: "extractProject",
      };

    case "invalid_value":
      return {
        file: "executeIntent.js",
        function: "isValidValue",
      };

    case "duplicate":
      return {
        file: "executeIntent.js",
        function: "mergeProjects",
      };

    default:
      return null;
  }
}

// =========================
// 🧠 SUGERENCIAS
// =========================
function suggestFix(reason, recurring = false) {
  if (recurring) {
    return "Este patrón se está repitiendo. Ya es un problema estructural.";
  }

  switch (reason) {
    case "blocked_by_intelligence":
      return "Memory Intelligence está bloqueando el guardado. Ajusta scoring o thresholds.";

    case "empty_extraction":
      return "El extractor no devuelve datos. Revisa extractProject o bloquea preguntas en detectIntent.";

    case "invalid_value":
      return "El valor no pasa validación. Mejora filtros o normalización.";

    case "duplicate":
      return "Se intenta guardar algo existente. Revisa lógica de merge o detección previa.";

    default:
      return "Revisar lógica general del flujo.";
  }
}
