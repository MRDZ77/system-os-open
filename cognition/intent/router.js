export async function routeIntent(userId, message, intents) {
  console.log("🧠 ROUTER:", intents);

  // 🔥 asegurar array
  if (!Array.isArray(intents)) return intents;

  // =========================
  // 🧠 FASE 3: ROUTER PASIVO
  // =========================
  // ❌ NO guarda memoria
  // ❌ NO ejecuta lógica
  // ✅ SOLO deja pasar intents

  return intents;
}
