export type OrderStatus =
  | "pending"
  | "routing"
  | "building"
  | "submitted"
  | "confirmed"
  | "failed";

export interface Order {
  orderId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
}