import { saveStructuredMemory } from "./saveStructuredMemory.js";

export async function autoSaveMemory(userId, message) {
  if (!message) return;

  const lower = message.toLowerCase();

  console.log("🧠 ANALYZING MESSAGE:", message);

  // ===============================
  // DETECTAR "me llamo"
  // ===============================
  if (lower.includes("me llamo")) {
    console.log("✅ DETECTED 'me llamo'");

    const parts = message.split(/me llamo/i);
    const name = parts[1]?.trim();

    console.log("🧠 EXTRACTED NAME:", name);

    if (name && name.length < 40) {
      console.log("💾 SAVING NAME...");

      await saveStructuredMemory({
        userId,
        key: "name",
        value: name,
        weight: 1,
      });

      console.log("✅ NAME SAVED");
    } else {
      console.log("❌ INVALID NAME");
    }
  }
}
