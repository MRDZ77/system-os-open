import openai from "../../services/openai.js";
import { getSystemState } from "../../../cognition/analysis/getSystemState.js";

export async function agentLoop({ message, context, analyzeMode }) {
  console.log("🧠 AGENT LOOP START");

  const text = message.toLowerCase();
  const memory = context?.structuredMemory || {};
  function cleanProjects(str) {
    return str
      ?.split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
  }
  // ======================
  // 🔥 CAPA 1: FAST RULES
  // ======================

  if (
    text.includes("en que estoy trabajando") ||
    text.includes("actualmente") ||
    text.includes("ahorita")
  ) {
    if (memory.projects) {
      console.log("🧠 AGENT: FAST CONTEXT RECALL");
      const projects = cleanProjects(memory.projects);
      return `Actualmente estás trabajando en ${projects}.`;
    }
  }

  if (text.includes("quien soy") || text.includes("recuerdas quien soy")) {
    if (memory.name) {
      console.log("🧠 AGENT: FAST NAME RECALL");
      return `Eres ${memory.name}.`;
    }
  }
  if (
    text.includes("en que estado") ||
    text.includes("estado del sistema") ||
    text.includes("que tienes guardado") ||
    text.includes("que sabes de ti")
  ) {
    console.log("🧠 AGENT: SYSTEM STATE RECALL");
    const state = await getSystemState("admin");
    if (state) {
      return `Estado del sistema:
  - Usuario: ${state.usuario}
  - Proyectos: ${state.proyectos}
  - Archivos en memoria: ${state.archivosEnMemoria.join(", ") || "ninguno"}
  - Fecha: ${state.fecha}`;
    }
  }

  // =========================
  // 🧠 ANALYZE MODE (NUEVO)
  // =========================
  if (analyzeMode) {
    console.log("🧠 AGENT: ANALYZE MODE");
    const files = context?.files || {};
    const fileContent = Object.entries(files)
      .map(([k, v]) => `[${k}]\n${v}`)
      .join("\n\n");
    const goal = fileContent
      ? `Analiza este contenido y da tu opinión concreta:\n\n${fileContent}`
      : `Analiza a fondo este contenido y responde con criterio:\n\n${message}`;
    const res = await think({
      goal,
      memory,
      files,
      steps: [],
    });
    return res?.output || null;
  }

  // ======================
  // 🧠 CAPA 2: AGENTE
  // ======================
  console.log("🧠 HISTORY LENGTH:", context?.messages?.length);
  console.log("🧠 FILES:", Object.keys(context?.files || {}));
  console.log("🧠 AGENT: THINKING MODE");

  let state = {
    goal: message,
    memory,
    files: context?.files || {},
    history: context?.messages || [],
    steps: [],
    contextUsed: null,
    reflection: null,
  };

  let bestReflection = null; // ✅ agregado

  for (let step = 0; step < 3; step++) {
    console.log(`🧠 STEP ${step}`);

    const decision = await think(state);

    console.log("🧠 DECISION:", decision);

    if (!decision || !decision.type) break;

    // ======================
    // RESPONDER DIRECTO
    // ======================
    if (decision.type === "respond") {
      console.log("🧠 FINAL RESPONSE (MODEL)");
      state.final = {
        type: "respond",
        output: decision.output,
      };

      break;
    }

    // ======================
    // RECALL
    // ======================
    if (decision.type === "recall") {
      console.log("🧠 ACTION: RECALL");
      state.steps.push("recall");
      state.contextUsed = memory;
      if (
        decision.output &&
        !decision.output.toLowerCase().includes("no he recibido") &&
        !decision.output.toLowerCase().includes("no tengo acceso") &&
        decision.output.trim() !== ""
      ) {
        bestReflection = decision.output;
        break;
      }
      // forzar reflect si recall falló
      state.steps.push("reflect");
      const retry = await think({ ...state, steps: ["reflect"] });
      if (retry?.output) {
        bestReflection = retry.output;
      }
      break;
    }
    // ======================
    // REFLECT
    // ======================
    if (decision.type === "reflect") {
      console.log("🧠 ACTION: REFLECT");

      state.steps.push("reflect");

      if (decision.output && decision.output.trim() !== "") {
        console.log("🧠 USING MODEL REFLECTION");
        bestReflection = decision.output;
        state.reflection = decision.output;

        console.log("🧠 BREAK LOOP (MODEL REFLECTION FOUND)");
        break; // 🔥 cortar loop aquí
      } else if (!state.reflection && memory.projects) {
        const projects = cleanProjects(memory.projects);
        state.reflection = `Trabajas en ${projects}`;

        console.log("🧠 FALLBACK REFLECTION (FACT ONLY)");
        break; // 🔥 cortar también aquí
      }

      console.log("🧠 BREAK LOOP (EMPTY REFLECTION)");
      break;
    }
  }
  // ======================
  // 🧠 GENERACIÓN FINAL (SIN MODELO)
  // ======================
  if (bestReflection || state.reflection) {
    console.log("🧠 GENERATING FINAL RESPONSE");

    const finalReflection = bestReflection || state.reflection;

    const parts = finalReflection.split(". ");

    let response = "";

    if (parts[0]) {
      let first = parts[0].trim();

      if (first.startsWith("El usuario trabaja en")) {
        first = first.replace("El usuario trabaja en", "Trabajas en");
      }

      response += first + ". ";
    }
    if (parts[1]) {
      response += parts[1].trim();
    }

    state.final = {
      type: "reflect",
      output: response.trim(),
    };
  }

  console.log("⚠️ AGENT: NO UNRESOLVED");
  if (state.final) {
    console.log("🧠 AGENT: RESOLVED OUTPUT");
    return state.final.output;
  }
  return null;
}

// ======================
// 🧠 THINK
// ======================

async function think(state) {
  const historial =
    state.history && state.history.length > 0
      ? state.history
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")
      : "Sin historial";

  const prompt = `
  You are a cognitive operator. Always respond in the same language the user writes in. If they write in Spanish, respond in Spanish. If they write in English, respond in English.

  Eres un operador técnico. No un asistente. No un chatbot.

  Reglas absolutas:
  - No rellenes. No valides emocionalmente.
  - No preguntes si ya tienes suficiente contexto.
  - Si el usuario no pidió análisis, quiere resolución.
  - Resuelve primero. Explica después si es necesario.
  - Cero frases como "¡Genial!", "¡Interesante!", "¿Puedes contarme más?"
  - Responde directo, corto, útil.

  Voz:
  - Directo. Preciso. Sin relleno.
  - No enumeres temas genéricos. Habla de lo que el usuario tiene enfrente.
  - Si te preguntan opinión, da una. Concreta. Sin escaparte.

  Intención:
  - Mantén el hilo. No empieces de cero cada mensaje.
  - Si el usuario dice "como que" o "dime más" — profundiza en LO MISMO.

  Usuario: ${state.memory?.name || "desconocido"}.
  Proyectos: ${state.memory?.projects || "no especificados"}.

Historial reciente:
${historial}

Usuario ahora dice:
${state.goal}

Memoria del usuario:
${JSON.stringify(state.memory)}

ARCHIVOS DISPONIBLES — LÉELOS Y ÚSALOS PARA RESPONDER:
${
  Object.keys(state.files).length > 0
    ? Object.entries(state.files)
        .map(([k, v]) => `[${k}]\n${String(v).slice(0, 3000)}`)
        .join("\n\n")
    : "ninguno"
}

REGLA CRÍTICA: Si hay archivos arriba, el usuario está preguntando sobre ellos. LÉELOS y responde basándote en su contenido. NUNCA digas que no tienes acceso a archivos.

Historial:
${state.steps.join(", ")}

Decide:

- respond
- recall
- reflect

Reglas:
- Opinión o razonamiento complejo → reflect
- Datos directos o factual recall → recall
- Conversación casual/simple → respond
- Si requiere explicación, abstracción o construir una idea → reflect
- NUNCA digas "no tengo opinión"
- NUNCA hagas preguntas en reflect

Responde JSON:
{
  "type": "...",
  "output": "solo si respond o reflect"
}
`;

  const res = await openai.sendPrompt(prompt);

  try {
    return JSON.parse(cleanJSON(res));
  } catch {
    return { type: "respond", output: res };
  }
}

// ======================
// CLEAN JSON
// ======================

function cleanJSON(str) {
  return str
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}
