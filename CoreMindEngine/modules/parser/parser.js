// CoreMindEngine/modules/parser/parser.js

function sanitize(text) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, 1000);
}

module.exports = {
  sanitize,
};
