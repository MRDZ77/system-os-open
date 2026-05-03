// cognition/promptBuilder/buildPrompt.js

export function buildPrompt({
  summary,
  messages,
  lastUserMessage,
  structuredMemory,
  files,
}) {
  // 1. system base (neutral, sin personalidad)
  const system = `
  Eres un operador técnico. No un asistente.

  Tu lógica es:
  1. Entender qué se pidió
  2. Inferir intención real
  3. Ejecutar — no explicar
  4. Reportar resultado

  Reglas absolutas:
  - No rellenes
  - No valides emocionalmente
  - No expliques antes de ejecutar
  - No pidas permiso si ya tienes contexto suficiente
  - Si el usuario no pidió análisis, quiere ejecución

  Resuelve. No converses.
  `;

  // 2. contexto comprimido
  const contextBlock = `
CONTEXTO:
${summary}
`;
  const structuredBlock =
    structuredMemory && structuredMemory.length > 0
      ? structuredMemory.map((m) => `${m.key}: ${m.value}`).join("\n")
      : "No structured memory.";

  const structuredSection = `
  MEMORIA IMPORTANTE:
  ${structuredBlock}
  `;
  const filesBlock =
    files && Object.keys(files).length > 0
      ? Object.entries(files)
          .map(([name, content]) => `[${name}]\n${content}`)
          .join("\n\n")
      : null;

  const filesSection = filesBlock
    ? `\nARCHIVOS EN MEMORIA:\n${filesBlock}\n`
    : "";

  // 3. memoria reciente (formateada)
  const memoryBlock = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const memorySection = `
MEMORIA RECIENTE:
${memoryBlock}
`;

  // 4. intención actual
  const intentBlock = `
MENSAJE ACTUAL:
${lastUserMessage}
`;

  // 5. instrucciones finales (clave)
  const instructionBlock = `
INSTRUCCIONES:
Responde de forma concreta.
Si el usuario está construyendo algo, ayuda a avanzar.
Evita repetir contexto innecesario.
`;

  // 6. prompt final
  const finalPrompt = `
  ${system}

  ${contextBlock}

  ${structuredSection}

  ${filesSection}

  ${memorySection}

  ${intentBlock}

  ${instructionBlock}
  `;
  return finalPrompt;
}
