const { Queue } = require("bullmq");
const Redis = require("ioredis");
require("dotenv").config();

const connection = new Redis(process.env.REDIS_URL);

const orderQueue = new Queue("orders", { connection });

(async () => {
  const counts = await orderQueue.getJobCounts();
  console.log("Queue Stats:", counts);
  process.exit();
})();