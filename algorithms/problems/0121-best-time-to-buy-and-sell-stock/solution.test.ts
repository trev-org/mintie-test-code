import assert from "node:assert/strict";
import test from "node:test";
import { maxProfit } from "./solution.js";

test("finds the best later sale", () => {
  assert.equal(maxProfit([7, 1, 5, 3, 6, 4]), 5);
});

test("returns zero when no profit is possible", () => {
  assert.equal(maxProfit([7, 6, 4, 3, 1]), 0);
});

test("handles an empty price list", () => {
  assert.equal(maxProfit([]), 0);
});
