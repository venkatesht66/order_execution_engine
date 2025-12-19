import WebSocket from "ws";
import axios from "axios";

interface OrderResponse {
  orderId: string;
}

interface WSMessage {
  status: string;
  orderId: string;
  txHash?: string;
  price?: number;
  dex?: string;
}

const SERVER_URL = "http://localhost:3000";

async function submitOrder(symbol: string, side: "buy" | "sell", quantity: number) {
  const { data } = await axios.post<OrderResponse>(`${SERVER_URL}/api/orders/execute`, {
    symbol,
    side,
    quantity,
  });
  return data.orderId;
}

function listenToOrder(orderId: string) {
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(`${SERVER_URL.replace("http", "ws")}/ws/orders?orderId=${orderId}`);

    ws.on("open", () => console.log(`WS Connected for order ${orderId}`));

    ws.on("message", (msg) => {
      const data: WSMessage = JSON.parse(msg.toString());
      console.log(`[${orderId}] ===>>`, data.status, data.dex ? `DEX: ${data.dex}` : "", data.txHash ? `TX: ${data.txHash}` : "", data.price ? `Price: ${data.price}` : "");

      if (data.status === "confirmed" || data.status === "failed") {
        ws.close();
        resolve();
      }
    });

    ws.on("close", () => console.log(`WS Closed for order ${orderId}`));
    ws.on("error", (err) => console.error(`WS Error [${orderId}]:`, err.message));
  });
}

async function main() {
  const orders = [
    { symbol: "AAPL", side: "buy" as const, quantity: 10 },
    { symbol: "TSLA", side: "sell" as const, quantity: 5 },
    { symbol: "GOOG", side: "buy" as const, quantity: 3 },
    { symbol: "ETH", side: "buy" as const, quantity: 2 },
    { symbol: "SOL", side: "sell" as const, quantity: 8 }
  ];

  const orderPromises = [];

  for (const order of orders) {
    const orderId = await submitOrder(order.symbol, order.side, order.quantity);
    console.log(`New order submitted: ${orderId}`);

    orderPromises.push(listenToOrder(orderId));
  }

  await Promise.all(orderPromises);
}

main().catch(console.error);