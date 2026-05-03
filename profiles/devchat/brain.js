import { coreServe } from "./coreServe.js";
import { coreIntent } from "./coreIntent.js";
import { coreRules } from "./coreRules.js";
import { coreVoice } from "./coreVoice.js";

export function buildBrainContext({
  userMessage,
  memorySummary,
  structuredMemory,
}) {
  // 🔥 convertir objeto → texto usable
  let persistentState = "Sin datos persistentes";

  if (structuredMemory && Object.keys(structuredMemory).length > 0) {
    const lines = [];

    if (structuredMemory.name) {
      lines.push(`El usuario se llama ${structuredMemory.name}.`);
    }

    if (structuredMemory.projects) {
      lines.push(`El usuario trabaja en ${structuredMemory.projects}.`);
    }

    persistentState = lines.join("\n");
  }

  console.log("🧠 BRAIN STRUCTURED INPUT:", structuredMemory);
  console.log("🧠 BRAIN PERSISTENT STATE:", persistentState);

  return `
${coreServe}

${coreIntent}

${coreRules}

${coreVoice}

ESTADO DEL USUARIO (PERSISTENTE):
${persistentState}

Contexto previo:
${memorySummary || "Sin contexto"}

Mensaje del usuario:
${userMessage}

Proceso interno (NO mostrar al usuario):
1. Analiza el mensaje
2. Cruza con el contexto previo y estado persistente
3. Decide la mejor respuesta

Salida:
Responde únicamente con la respuesta final.
No muestres tu proceso interno.
`;
}
