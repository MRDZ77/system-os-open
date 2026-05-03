// cognition/summarize.js

export default function summarize(messages = []) {
  if (!messages.length) return "";

  // 1. tomar últimos N mensajes relevantes
  const recent = messages.slice(-6);

  // 2. separar user y assistant
  const userInputs = recent
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase());

  const assistantOutputs = recent
    .filter((m) => m.role === "assistant")
    .map((m) => m.content.toLowerCase());

  // 3. detectar intención básica (heurística MVP)
  let intent = "";

  const lastUser = userInputs[userInputs.length - 1] || "";

  if (lastUser.includes("cómo") || lastUser.includes("como")) {
    intent = "El usuario busca instrucciones o estructura";
  } else if (lastUser.includes("qué") || lastUser.includes("que")) {
    intent = "El usuario busca definición o claridad";
  } else if (lastUser.includes("continuar")) {
    intent = "El usuario quiere avanzar en un proceso";
  } else {
    intent = "El usuario está desarrollando una idea";
  }

  // 4. detectar tema (muy simple pero útil)
  const fullText = userInputs.join(" ");

  let topic = "";

  if (fullText.includes("memoria")) {
    topic = "un sistema de memoria";
  } else if (fullText.includes("cognition")) {
    topic = "el módulo Cognition";
  } else if (fullText.includes("prompt")) {
    topic = "la construcción de prompts";
  } else {
    topic = "un sistema en desarrollo";
  }

  // 5. construir summary
  const summary = `${intent} relacionado con ${topic}.`;

  return summary;
}
