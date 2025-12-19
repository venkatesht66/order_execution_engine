export interface Order {
  orderId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class MockDexRouter {
  async getRaydiumQuote(amount: number) {
    await sleep(200);
    return {
      dex: "Raydium",
      price: 100 * (0.98 + Math.random() * 0.04),
      fee: 0.003
    };
  }

  async getMeteoraQuote(amount: number) {
    await sleep(200);
    return {
      dex: "Meteora",
      price: 100 * (0.97 + Math.random() * 0.05),
      fee: 0.002
    };
  }

  async executeSwap(
    order: Order,
    dex: string,
    quotedPrice: number,
    slippageBps = 50
  ) {

    await sleep(2000 + Math.random() * 1000);

    const marketImpact = (Math.random() - 0.5) * 0.006;
    const executedPrice = quotedPrice * (1 + marketImpact);

    const maxAllowedSlippage = quotedPrice * (slippageBps / 10_000);

    if (Math.abs(executedPrice - quotedPrice) > maxAllowedSlippage) {
      throw new Error("Slippage tolerance exceeded");
    }

    return {
      txHash: `0xMOCK_${Math.random().toString(36).slice(2)}`,
      executedPrice: Number(executedPrice.toFixed(6)),
      slippage: Number(((executedPrice - quotedPrice) / quotedPrice * 100).toFixed(3))
    };
  }
}