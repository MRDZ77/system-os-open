export function reasoningLogic(userMessage) {
  if (!userMessage) {
    return "Respuesta neutral.";
  }

  if (userMessage.includes("?")) {
    return "Responder con claridad y precisión.";
  }

  if (userMessage.length < 20) {
    return "Respuesta breve pero pensada.";
  }

  return "Respuesta coherente con contexto.";
}
