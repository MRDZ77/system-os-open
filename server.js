import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import keepAlive from "./CoreMindEngine/services/keepalive.js";
import logger from "./CoreMindEngine/utils/logger.js";
import { runDevChat } from "./CoreMindEngine/modules/router/devchat.js";
import { startExecutor } from "./CoreMindEngine/modules/executor/executor.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(cors());

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: "TOO_MANY_REQUESTS" });
  },
});

app.use(globalLimiter);

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "." });
});

app.post("/devchat", async (req, res) => {
  try {
    let { userId, message } = req.body;
    if (!userId || !message) {
      return res
        .status(400)
        .json({ success: false, error: "userId y message requeridos" });
    }
    if (message.trim().startsWith("/task ")) {
      message = `__TASK__${message.replace("/task ", "").trim()}`;
    }
    const result = await runDevChat({ userId, message });
    return res.json(result);
  } catch (err) {
    console.error("Error en /devchat:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/dev-memory", async (req, res) => {
  try {
    let { userId, message } = req.body;
    if (!userId || !message) {
      return res
        .status(400)
        .json({ success: false, error: "userId y message requeridos" });
    }
    if (message.trim().startsWith("/task ")) {
      message = `__TASK__${message.replace("/task ", "").trim()}`;
    }
    const result = await runDevChat({ userId, message });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error en /dev-memory:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/upload-doc", async (req, res) => {
  try {
    const { userId, fileName, fileData, fileType } = req.body;
    if (!userId || !fileName || !fileData) {
      return res.status(400).json({ success: false, error: "faltan datos" });
    }

    let content = "";

    if (fileType === "application/pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const buffer = Buffer.from(fileData, "base64");
      const parsed = await pdfParse(buffer);
      content = parsed.text;
    } else {
      content = Buffer.from(fileData, "base64").toString("utf-8");
    }

    const db = (await import("./CoreMindEngine/database/connection.js"))
      .default;
    await db.query(
      `INSERT INTO file_memory (user_id, file_name, content) VALUES ($1, $2, $3) ON CONFLICT (user_id, file_name) DO UPDATE SET content = $3`,
      [userId, fileName, content],
    );

    return res.json({
      success: true,
      response: `Archivo ${fileName} guardado. Puedes pedirme que lo analice.`,
    });
  } catch (err) {
    console.error("Error en /upload-doc:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

if (process.env.KEEPALIVE_URL) {
  keepAlive(process.env.KEEPALIVE_URL);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.log(`Servidor corriendo en puerto ${PORT}`);
  startExecutor();
});
