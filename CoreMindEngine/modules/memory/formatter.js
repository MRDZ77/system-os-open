// CoreMindEngine/modules/memory/formatter.js

function formatMemory(rows) {
  return rows.reverse().map((r) => {
    return `${r.role.toUpperCase()}: ${r.message}`;
  });
}

module.exports = {
  formatMemory,
};
