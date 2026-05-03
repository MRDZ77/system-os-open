export function autoFix(insight) {
  if (!insight) return null;

  switch (insight.issue) {
    case "empty_extraction":
      return {
        type: "detectIntent_patch",
        target: "fallback_guard",
        description: "Bloquear preguntas que caen en fallback save",
      };

    case "invalid_value":
      return {
        type: "executeIntent_patch",
        target: "validation",
        description: "Mejorar filtros de validación",
      };

    case "duplicate":
      return {
        type: "executeIntent_patch",
        target: "merge",
        description: "Evitar duplicados correctamente",
      };

    default:
      return null;
  }
}
