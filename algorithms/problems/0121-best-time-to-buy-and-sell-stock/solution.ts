export function maxProfit(prices: readonly number[]): number {
  let minimumPrice = Number.POSITIVE_INFINITY;
  let bestProfit = 0;

  for (const price of prices) {
    minimumPrice = Math.min(minimumPrice, price);
    bestProfit = Math.max(bestProfit, price - minimumPrice);
  }

  return bestProfit;
}
