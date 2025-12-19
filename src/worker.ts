import { Worker } from "bullmq";
import { redis } from "./queue.js";
import { MockDexRouter } from "./dex/mockDexRouter.js";
import { publishOrderEvent } from "./ws/events.js";
import { saveOrder } from "./db/postgres.js";
import "dotenv/config";

const router = new MockDexRouter();

const worker = new Worker(
  "orders",
  async job => {
    const { orderId, quantity } = job.data;

    try {
      console.log("Processing job:", job.data);

      publishOrderEvent(orderId, { status: "routing" });

      const r = await router.getRaydiumQuote(quantity);
      const m = await router.getMeteoraQuote(quantity);

      const best = r.price > m.price ? r : m;
      console.log("Routed to", best.dex);

      publishOrderEvent(orderId, { status: "building", dex: best.dex });

      publishOrderEvent(orderId, {
        status: "submitted",
        dex: best.dex,
        slippageBps: 50
      });

      const result = await router.executeSwap(
        job.data,
        best.dex,
        best.price,
        50
      );

      publishOrderEvent(orderId, {
        status: "confirmed",
        txHash: result.txHash,
        price: result.executedPrice,
        slippage: result.slippage
      });

      await saveOrder(orderId, "confirmed", result);

    } catch (err: any) {
      publishOrderEvent(orderId, {
        status: "failed",
        error: err.message ?? "Execution error"
      });

      throw err;
    }
  },
  {
    connection: redis,
    concurrency: 10
  }
);

worker.on("failed", async (job, err) => {
  if (!job) return;

  const { orderId } = job.data;

  console.error(
    `❌ Order ${orderId} permanently failed after ${job.attemptsMade} attempts`,
    err.message
  );

  publishOrderEvent(orderId, {
    status: "failed",
    reason: err.message
  });

  await saveOrder(orderId, "failed", {
    reason: err.message,
    attempts: job.attemptsMade
  });
});