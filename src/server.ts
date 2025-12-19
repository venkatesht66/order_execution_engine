import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { v4 as uuid } from "uuid";
import { orderQueue } from "./queue.js";
import { addClient, removeClient, broadcast, getLatestStatus } from "./ws/wsManager.js";
import type { WebSocket as WS } from "ws";
import { redis } from "./queue.js";
import "dotenv/config";
import "./worker.js";

const app = Fastify({ logger: true });

await app.register(websocket);

const sub = redis.duplicate();
await sub.subscribe("order-events");

sub.on("message", (_, message) => {
  const { orderId, payload } = JSON.parse(message);
  broadcast(orderId, payload);
});

app.post("/api/orders/execute", async (req, reply) => {
  const { symbol, side, quantity } = req.body as any;

  if (!symbol || !side || !quantity) {
    return reply.code(400).send({ error: "Invalid order" });
  }

  const orderId = uuid();

  await orderQueue.add("orders", { orderId, symbol, side, quantity });

  broadcast(orderId, { status: "pending" });

  return { orderId };
});

app.get("/ws/orders", { websocket: true }, (socketStream, request) => {
  const ws = socketStream.socket as WS;

  const params = new URLSearchParams(request.url.split("?")[1] ?? "");
  const orderId = params.get("orderId");
  if (!orderId) return ws.close();

  addClient(orderId, ws);

  const latest = getLatestStatus(orderId);
  if (latest) {
    ws.send(JSON.stringify(latest));
  } else {
    ws.send(JSON.stringify({ status: "pending", orderId }));
  }

  ws.on("close", () => removeClient(orderId, ws));
  ws.on("error", () => removeClient(orderId, ws));
});

app.listen({ port: 3000 }, () => {
  console.log("🚀 Server running on http://localhost:3000");
});