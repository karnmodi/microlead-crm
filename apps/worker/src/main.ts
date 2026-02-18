import { Worker } from "bullmq";
import IORedis from "ioredis";
import { APP_NAME, DEFAULT_QUEUE_NAME, type HeartbeatJob } from "@microlead-crm/shared";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  DEFAULT_QUEUE_NAME,
  async (job) => {
    const data = job.data as HeartbeatJob;
    if (data?.kind === "heartbeat") {
      console.log(`[${APP_NAME}] heartbeat ok at ${data.at}`);
      return { ok: true };
    }
    console.warn(`[${APP_NAME}] unknown job`, job.name, job.data);
    return { ok: false };
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error(`[${APP_NAME}] job failed`, job?.id, err);
});

console.log(
  `${APP_NAME} worker listening on queue "${DEFAULT_QUEUE_NAME}" (REDIS_URL=${redisUrl.replace(/:[^:@/]+@/, ":****@")})`,
);
