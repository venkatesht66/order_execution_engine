import type { WebSocket as WS } from "ws";

const clients = new Map<string, Set<WS>>();
const latestStatus = new Map<string, any>();

export function addClient(orderId: string, socket: WS) {
  if (!clients.has(orderId)) {
    clients.set(orderId, new Set());
  }
  clients.get(orderId)!.add(socket);
}

export function removeClient(orderId: string, socket: WS) {
  const set = clients.get(orderId);
  if (set) {
    set.delete(socket);
    if (set.size === 0) {
      clients.delete(orderId);
      latestStatus.delete(orderId);
    }
  }
}

export function broadcast(orderId: string, payload: any) {
  latestStatus.set(orderId, { orderId, ...payload });

  const sockets = clients.get(orderId);
  if (!sockets || sockets.size === 0) return;

  const message = JSON.stringify({ orderId, ...payload });

  for (const ws of sockets) {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  }
}

export function getLatestStatus(orderId: string) {
  return latestStatus.get(orderId);
}