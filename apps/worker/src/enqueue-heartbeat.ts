import { Queue } from "bullmq";
import IORedis from "ioredis";
import { DEFAULT_QUEUE_NAME, type HeartbeatJob } from "@microlead-crm/shared";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue(DEFAULT_QUEUE_NAME, { connection });

async function main() {
  const payload: HeartbeatJob = { kind: "heartbeat", at: new Date().toISOString() };
  await queue.add("heartbeat", payload);
  console.log(`Enqueued heartbeat on "${DEFAULT_QUEUE_NAME}" at ${payload.at}`);
  await queue.close();
  await connection.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
