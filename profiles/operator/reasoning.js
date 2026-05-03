export function reasoningLogic(userMessage) {
  if (!userMessage) {
    return "Mantener estado operativo.";
  }

  if (
    userMessage.includes("crear") ||
    userMessage.includes("hacer") ||
    userMessage.includes("armar") ||
    userMessage.includes("construir")
  ) {
    return "Convertir objetivo en plan ejecutable.";
  }

  if (
    userMessage.includes("no se") ||
    userMessage.includes("atorado") ||
    userMessage.includes("bloqueado")
  ) {
    return "Detectar fricción y destrabar siguiente acción.";
  }

  if (userMessage.length < 20) {
    return "Reducir ambigüedad y mover siguiente paso.";
  }

  return "Evaluar estado y avanzar objetivo.";
}
