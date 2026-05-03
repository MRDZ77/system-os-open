// CoreMindEngine/services/keepalive.js

const axios = require("axios");

function keepAlive(url) {
  setInterval(
    async () => {
      try {
        await axios.get(url);
        console.log("🌐 KeepAlive ping");
      } catch (err) {
        console.error("❌ KeepAlive error:", err.message);
      }
    },
    1000 * 60 * 4,
  ); // cada 4 minutos
}

module.exports = keepAlive;
