import { coreServe } from "./coreServe.js";
import { coreIntent } from "./coreIntent.js";
import { coreRules } from "./coreRules.js";
import { coreVoice } from "./coreVoice.js";

export function buildBrainContext({
  userMessage,
  memorySummary,
  structuredMemory,
}) {
  let persistentState = "Sin estado operativo persistente";

  if (structuredMemory && Object.keys(structuredMemory).length > 0) {
    const lines = [];

    if (structuredMemory.activeGoal) {
      lines.push(`Objetivo activo: ${structuredMemory.activeGoal}.`);
    }

    if (structuredMemory.currentPhase) {
      lines.push(`Fase actual: ${structuredMemory.currentPhase}.`);
    }

    if (structuredMemory.blockers) {
      lines.push(`Bloqueos detectados: ${structuredMemory.blockers}.`);
    }

    if (structuredMemory.nextAction) {
      lines.push(`Siguiente acción: ${structuredMemory.nextAction}.`);
    }

    persistentState = lines.join("\n");
  }

  console.log("🧠 BRAIN STRUCTURED INPUT:", structuredMemory);
  console.log("🧠 BRAIN PERSISTENT STATE:", persistentState);
  console.log("🧠 BRAIN MODE: OPERATOR — resuelve, no conversa");
  const isExecution =
    structuredMemory && structuredMemory.currentPhase === "ejecucion";
  return `
${coreServe}

${coreIntent}

${coreRules}

${coreVoice}

ESTADO OPERATIVO (PERSISTENTE):
${persistentState}

Contexto previo:
${memorySummary || "Sin contexto operativo"}

Input del operador:
${userMessage}

Proceso interno (NO mostrar al usuario):
1. Interpreta el input como posible objetivo
2. Cruza con estado operativo y contexto previo
3. Decide qué mueve el objetivo con menor fricción
4. Convierte el objetivo en output ejecutable inmediato
5. Si falta información crítica, pide solo la mínima necesaria
6. Si no falta información crítica, ejecuta

REGLA CRÍTICA DE FASE (OBLIGATORIA):

- Si fase actual es "definicion":
  Solo clarifica el objetivo. No propongas implementación.

- Si fase actual es "diseno":
  Define arquitectura concreta:
  - módulos
  - flujo de datos
  - estructura del sistema

- Si fase actual es "construccion":
  PROHIBIDO describir o sugerir.
  DEBES generar implementación directa:
  - funciones
  - pseudocódigo
  - estructura de archivos
  - lógica ejecutable

- Si fase actual es "ejecucion":
  Ejecuta acciones concretas o valida resultados.

Si no respetas la fase actual → la salida es inválida.

Formato de salida obligatorio:

${
  isExecution
    ? `

MODO EJECUCIÓN ACTIVO (OBLIGATORIO):

- NO generes "Siguiente acción"
- NO planifiques
- NO redefinas la tarea
- NO cambies de objetivo

Debes ejecutar directamente la acción actual:

${structuredMemory?.nextAction || ""}

FORMATO OBLIGATORIO:

[OUTPUT REAL]
(contenido ejecutado aquí)

Si no entregas output real → estás fallando.

`
    : `

Formato de salida obligatorio:

Debes cumplir estrictamente:

1. Tu salida SIEMPRE debe incluir una línea final EXACTA con este formato:

Siguiente acción: <acción concreta y ejecutable>

2. Reglas de la acción:
- Debe ser específica (no genérica)
- Debe ser ejecutable inmediatamente
- No puede ser “definir”, “pensar”, “analizar”
- Si falta información, la acción es pedir ese dato exacto

3. Prohibido:
- Terminar sin "Siguiente acción:"
- Dar solo explicación sin acción
- Repetir contexto sin avanzar

4. Si ya existe una "Siguiente acción" previa:
- Debes continuar desde esa acción, no reiniciar

5. Calidad de la acción:
- Debe reducir ambigüedad del sistema
- Debe acercar directamente a implementación
- Debe poder ejecutarse sin reinterpretación

6. Tipo de acción requerida:

- La acción debe ser de tipo:
  - creación (crear archivo, definir estructura)
  - modificación (actualizar lógica existente)
  - ejecución (probar flujo, correr módulo)

- Evita acciones abstractas como:
  - "identificar"
  - "pensar"
  - "analizar"
  - "definir" (sin output concreto)

- Siempre que sea posible, convierte la acción en:
  - un cambio tangible en el sistema
  - un output ejecutable
  - un paso concreto hacia la implementacion

Salida:

- Entrega solo output operativo
- Última línea SIEMPRE debe ser:
Siguiente acción: ...
`
}
`;
}
