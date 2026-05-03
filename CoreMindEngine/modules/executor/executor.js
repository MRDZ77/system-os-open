import db from "../../database/connection.js";
import { runDevChat } from "../router/devchat.js";

const TICK_INTERVAL = 10000; // cada 10 segundos
const userId = "admin";

async function getPendingTasks() {
  const res = await db.query(
    `SELECT id, task, status FROM executor_tasks 
     WHERE user_id = $1 AND status = 'pending' 
     ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  return res.rows[0] || null;
}

async function markTaskDone(id, result) {
  await db.query(
    `UPDATE executor_tasks SET status = 'done', result = $1 WHERE id = $2`,
    [result, id],
  );
}

async function tick() {
  const task = await getPendingTasks();
  if (!task) return;

  console.log("⚙️ EXECUTOR: tarea encontrada →", task.task);

  const res = await runDevChat({
    userId,
    message: `__TASK__${task.task}`,
  });

  await markTaskDone(task.id, res.response);
  console.log("✅ EXECUTOR: tarea completada →", task.id);
}

export function startExecutor() {
  console.log("⚙️ EXECUTOR: arrancando...");
  setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      console.error("💥 EXECUTOR ERROR:", err.message);
    }
  }, TICK_INTERVAL);
}
