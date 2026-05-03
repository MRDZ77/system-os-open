import readline from "readline";
import { runDevChat } from "./CoreMindEngine/modules/router/devchat.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const userId = "admin";

console.log("🧠 Chat iniciado\n");

function ask() {
  rl.question("\nTÚ: ", async (input) => {
    if (!input.trim()) return ask();
    if (input === "exit") return rl.close();

    if (input.startsWith("/task ")) {
      const task = input.replace("/task ", "").trim();
      const res = await runDevChat({ userId, message: `__TASK__${task}` });
      console.log("AI:", res.response);
      return ask();
    }

    if (input.startsWith("/file ")) {
      const { readFileSync } = await import("fs");
      const filePath = input.replace("/file ", "").trim();
      const fileName = filePath.split("/").pop();
      const content = readFileSync(filePath, "utf-8");
      await runDevChat({ userId, message: `__FILE__${fileName}__${content}` });
      console.log(`AI: Archivo ${fileName} guardado en memoria.`);
      return ask();
    }

    const res = await runDevChat({ userId, message: input });

    console.log("AI:", res.response);

    ask();
  });
}

ask();
