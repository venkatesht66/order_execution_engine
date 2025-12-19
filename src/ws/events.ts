import { redis } from "../queue.js";
import { saveOrder } from "../db/postgres.js";

export async function publishOrderEvent(orderId: string, payload: any) {
  await saveOrder(orderId, payload.status, payload);

  await redis.publish(
    "order-events",
    JSON.stringify({ orderId, payload })
  );
}