/** Default BullMQ queue name for microlead-crm workers and producers. */
export const DEFAULT_QUEUE_NAME = "microlead-crm" as const;

export type HeartbeatJob = {
  kind: "heartbeat";
  at: string;
};

export type JobPayload = HeartbeatJob;
