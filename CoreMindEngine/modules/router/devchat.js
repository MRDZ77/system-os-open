import { buildContext } from "../../../cognition/buildContext.js";
import openai from "../../services/openai.js";
import db from "../../database/connection.js";
import { detectIntent } from "../../../cognition/intent/detectIntent.js";
import { routeIntent } from "../../../cognition/intent/router.js";
import { executeIntent } from "../../../cognition/intent/executeIntent.js";
import { saveStructuredMemory } from "../../../cognition/memory/saveStructuredMemory.js";
import { agentLoop } from "../../../CoreMindEngine/modules/thinking/agentLoop.js";
import { memoryIntelligence } from "../../../cognition/memory/memoryIntelligence.js";
import { executionInspector } from "../../../cognition/analysis/executionInspector.js";
import { buildBrainContext as buildOperatorContext } from "../../../profiles/operator/brain.js";

// 🔥 NUEVO IMPORT
import { autoFix } from "../self/autoFix.js";
import { applyFix } from "../self/applyFix.js";

// 🔴 PATCH 1 — NORMALIZADOR MINIMO (NO TOCA TU FLOW)
function normalizeFileAction(action = "") {
  return String(action)
    .trim()
    .replace(/([a-zA-Z0-9_]+)(js|json|md)\b/g, "$1.$2");
}

function extractOperationalState(message, response, previous = {}) {
  const clean = (str) => String(str || "").trim();

  return {
    activeGoal:
      previous.activeGoal ||
      (message.length < 100 ? clean(message.replace(/[?.!]/g, "")) : null),

    currentPhase: (() => {
      let phase = previous.currentPhase || "definicion";

      if (response && response.includes("Siguiente acción:")) {
        if (phase === "definicion") return "diseno";
        if (phase === "diseno") return "construccion";
        if (phase === "construccion") return "ejecucion";
      }

      return phase;
    })(),

    nextAction:
      previous.currentPhase === "ejecucion"
        ? previous.nextAction
        : response.includes("Siguiente acción:")
          ? clean(response.split("Siguiente acción:")[1]?.split("\n")[0])
          : previous.nextAction || null,

    blockers: previous.blockers || "ambigüedad estructural",

    pendingInput: previous.pendingInput || null,
  };
}

export async function runDevChat({ userId, message }) {
  if (!userId || !message) {
    throw new Error("DEVCHAT_MISSING_INPUT");
  }

  // 🔥 TASK HANDLER
  if (message.startsWith("__TASK__")) {
    const task = message.replace("__TASK__", "").trim();
    const raw = await openai.sendPrompt(`
  Eres un sistema ejecutor.
  El usuario quiere: ${task}
  Descompón en máximo 5 pasos. Marca cada uno como SISTEMA o HUMANO.
  Formato exacto por línea, nada más:
  PASO 1: SISTEMA: descripción
  PASO 2: HUMANO: descripción
  `);

    const { writeFileSync } = await import("fs");
    const lineas = raw.split("\n").filter((l) => l.includes("PASO"));
    let resultado = `Tarea: ${task}\n\n`;

    for (const linea of lineas) {
      if (linea.includes("SISTEMA:")) {
        const descripcion = linea.split("SISTEMA:")[1].trim();
        const codigo = await openai.sendPrompt(`
  Ejecuta esto y genera el código necesario:
  ${descripcion}
  Responde solo con el código, sin explicaciones.
  `);
        const { mkdirSync } = await import("fs");
        mkdirSync("output", { recursive: true });
        const nombreArchivo = `output/task_${Date.now()}.js`;
        writeFileSync(nombreArchivo, codigo);
        resultado += `${linea}\n✅ Ejecutado → ${nombreArchivo}\n\n`;
      } else {
        resultado += `${linea}\n⏸️ Requiere tu acción\n\n`;
      }
    }

    return { success: true, response: resultado };
  }

  // 🔥 FILE HANDLER
  if (message.startsWith("__FILE__")) {
    const withoutPrefix = message.replace("__FILE__", "");
    const separatorIndex = withoutPrefix.indexOf("__");
    const fileName = withoutPrefix.substring(0, separatorIndex);
    const content = withoutPrefix.substring(separatorIndex + 2);
    await saveStructuredMemory({
      userId,
      key: `file:${fileName}`,
      value: content,
      weight: 1,
    });
    return {
      success: true,
      response: `Archivo ${fileName} guardado en memoria.`,
    };
  }

  try {
    async function evaluateAndFix(response, logs) {
      const evaluation = {
        score: response && response.length > 20 ? 1 : 0,
      };

      console.log("🧠 EVALUATION:", evaluation);

      const insight = executionInspector({
        logs,
        evaluation,
      });

      if (insight) {
        console.log("🧠 INSIGHT DETECTADO:", insight);

        const fix = autoFix(insight);

        if (fix) {
          console.log("🛠️ AUTO FIX:", fix);

          const applied = await applyFix(fix);

          console.log("🧠 APPLY RESULT:", applied);
        }
      }

      return evaluation;
    }

    const intents = detectIntent(message);
    await routeIntent(userId, message, intents);

    const context = await buildContext(userId, message);

    const isAnalyzeIntent = intents.some(
      (i) => i.type === "content" && i.action === "analyze",
    );

    const normalized = String(message).toLowerCase().trim();

    const isOperatorMode = message.trim().startsWith("/task");

    const hasActiveGoal =
      context.structuredMemory && context.structuredMemory.activeGoal;

    if (hasActiveGoal) {
      console.log("🧠 FORCED OPERATOR MODE (ACTIVE GOAL)");
    }

    const isExplainMode =
      normalized.includes("explica") ||
      normalized.includes("explicame") ||
      normalized.includes("explícame");

    if (isOperatorMode && !isExplainMode && !isAnalyzeIntent) {
      console.log("🧠 MODE: OPERATOR");

      let injectedMessage = message;

      console.log("🔥 CHECK EXECUTION TRIGGER:", {
        normalized,
        phase: context.structuredMemory?.currentPhase,
        hasNext: !!context.structuredMemory?.nextAction,
      });

      const shouldInjectExecution =
        context.structuredMemory &&
        context.structuredMemory.nextAction &&
        (normalized.includes("sigue") ||
          normalized.includes("que sigue") ||
          normalized.includes("qué sigue"));

      const hasRealContext = Boolean(
        (context.memorySummary && context.memorySummary.length > 20) ||
          (context.structuredMemory &&
            context.structuredMemory.activeGoal &&
            context.structuredMemory.currentPhase),
      );

      const isAskingExplanation =
        normalized.includes("explica") ||
        normalized.includes("explíc") ||
        normalized.includes("por que") ||
        normalized.includes("por qué");

      if (shouldInjectExecution && !isAskingExplanation) {
        console.log("🔥 INJECTED MESSAGE TRIGGERED");

        let action = context.structuredMemory?.nextAction || "";
        action = normalizeFileAction(action);

        context.structuredMemory.nextAction = action;

        console.log("🧪 EXECUTION INPUT:", {
          action,
          memorySummary: context.memorySummary,
          structuredMemory: context.structuredMemory,
        });

        const hasConcreteArtifact = /\.(js|json|md)\b/.test(action);

        const hasImplementationIntent =
          action.includes("crear") ||
          action.includes("implementar") ||
          action.includes("generar");

        // 🔥 FIX 1
        const canExecute = hasConcreteArtifact && hasImplementationIntent;

        // 🔥 FIX 2 (log)
        console.log("🧪 EXECUTION FLAGS:", {
          hasConcreteArtifact,
          hasImplementationIntent,
          hasRealContext,
          canExecute,
          mode: "LENIENT_EXECUTION",
        });

        // 🔥 FIX 3
        if (!canExecute && !hasConcreteArtifact) {
          console.log("🚨 EXECUTION BLOCKED:", {
            action,
            reason: {
              missingArtifact: !hasConcreteArtifact,
              missingIntent: !hasImplementationIntent,
              missingContext: !hasRealContext,
            },
          });

          return {
            success: true,
            response: `
No puedo ejecutar esta acción todavía.

Falta:
${!hasConcreteArtifact ? "- objetivo de archivo concreto\n" : ""}
${!hasImplementationIntent ? "- intención de implementación real\n" : ""}
${!hasRealContext ? "- contexto suficiente del sistema\n" : ""}

Siguiente acción: definir archivo y estructura concreta para implementar
            `.trim(),
          };
        }

        console.log("✅ EXECUTION APPROVED:", { action });

        injectedMessage = `
EJECUTA ESTA ACCIÓN AHORA:

${action}

REGLAS ESTRICTAS:

- NO generes nueva "Siguiente acción"
- NO expliques
- NO reformules
- NO cambies de tarea

DEBES ENTREGAR:

- el archivo completo listo
- o el código exacto
- o la estructura final

FORMATO OBLIGATORIO:

[OUTPUT REAL]
(contenido aquí)

Si no generas output real, estás fallando.
        `;
      }

      const operatorPrompt = buildOperatorContext({
        userMessage: injectedMessage,
        memorySummary: context.memorySummary,
        structuredMemory: context.structuredMemory,
      });

      const operatorRaw = await openai.sendPrompt(operatorPrompt);

      let response = String(operatorRaw || "").trim();

      console.log("🧪 RAW MODEL RESPONSE:", operatorRaw);
      console.log("🧪 CLEAN RESPONSE:", response);

      if (response.includes("Siguiente acción:")) {
        console.log("🚨 STRIPPED NEXT ACTION (EXECUTION MODE)");
        response = response.split("Siguiente acción:")[0].trim();
      }

      console.log("🧪 FINAL RESPONSE:", response);

      const operationalState = extractOperationalState(
        message,
        response,
        context.structuredMemory,
      );

      console.log("🧠 OPERATOR STATE:", operationalState);

      if (!operationalState.nextAction) {
        console.log("⚠️ FORCING NEXT ACTION (GLOBAL FALLBACK)");

        operationalState.nextAction =
          "crear archivo base sistema_autonomo.js con estructura modular inicial";
      }

      let next = normalizeFileAction(operationalState.nextAction || "");
      const hasRealFile = /\.(js|json|md)\b/.test(next);

      if (!hasRealFile) {
        console.log("🚨 INVALID FILE → nextAction descartada");
        operationalState.nextAction = null;
      } else {
        operationalState.nextAction = next;
      }

      for (const [key, value] of Object.entries(operationalState)) {
        if (!value) continue;

        await saveStructuredMemory({
          userId,
          key,
          value,
        });
      }

      await evaluateAndFix(response, context.executionLog || []);

      return {
        success: true,
        response,
      };
    }

    const enhancedIntents = memoryIntelligence({
      message,
      intents,
      context,
    });

    const result = await executeIntent({
      intents: enhancedIntents,
      context,
      db,
    });

    const logs = context.executionLog || [];
    console.log("🧠 LOGS BEFORE INSPECTOR:", logs);

    if (!result && logs.length > 0) {
      return {
        success: true,
        response: "No pude procesar eso. ¿Puedes reformularlo?",
      };
    }

    if (result?.response) {
      const response = result.response;

      await evaluateAndFix(response, logs);

      return {
        success: true,
        response,
        logs: result.logs,
      };
    }

    const agentResponse = await agentLoop({
      message,
      context,
      analyzeMode: result?.analyzeMode,
    });

    if (agentResponse) {
      const response = agentResponse;

      await db.query(
        `INSERT INTO devchat_memory (user_id, role, content) VALUES ($1, 'user', $2)`,
        [userId, message],
      );
      await db.query(
        `INSERT INTO devchat_memory (user_id, role, content) VALUES ($1, 'assistant', $2)`,
        [userId, response],
      );

      await evaluateAndFix(response, logs);

      return {
        success: true,
        response,
      };
    }

    const memoryResult = await db.query(
      `SELECT role, content FROM devchat_memory
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId],
    );

    const memory =
      memoryResult.rows
        .reverse()
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n") || "Sin memoria";

    const prompt = `
Eres DevChat.

Memoria:
${memory}

Usuario:
${message}

Responde natural.
`;

    const ai = await openai.sendPrompt(prompt);

    const response = String(ai || "").trim();

    await evaluateAndFix(response, logs);

    return {
      success: true,
      response,
    };
  } catch (err) {
    console.error("💥 DEVCHAT ERROR REAL:", err);
    return {
      success: false,
      response: err.message,
    };
  }
}
