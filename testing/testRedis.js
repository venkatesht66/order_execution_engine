import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL);

try {
  const res = await redis.ping();
  console.log("Redis connected:", res);
  process.exit(0);
} catch (err) {
  console.error("Redis error:", err.message);
  process.exit(1);
}