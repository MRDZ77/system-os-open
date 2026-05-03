// CoreMindEngine/utils/logger.js

function log(...msg) {
  console.log("🧠 [CoreMindEngine]", ...msg);
}

function error(...msg) {
  console.error("❌ [CoreMindEngine ERROR]", ...msg);
}

module.exports = {
  log,
  error,
};
