import assert from "node:assert/strict";
import test from "node:test";
import { climbStairs } from "./solution.js";

test("counts routes for five steps", () => {
  assert.equal(climbStairs(5), 8);
});

test("handles the base cases", () => {
  assert.equal(climbStairs(1), 1);
  assert.equal(climbStairs(2), 2);
});

test("rejects a non-positive step count", () => {
  assert.throws(() => climbStairs(0), RangeError);
});
