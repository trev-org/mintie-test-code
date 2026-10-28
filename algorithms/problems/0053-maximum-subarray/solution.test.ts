import assert from "node:assert/strict";
import test from "node:test";
import { maxSubArray } from "./solution.js";

test("finds the largest contiguous sum", () => {
  assert.equal(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6);
});

test("returns the largest value for an all-negative input", () => {
  assert.equal(maxSubArray([-8, -3, -6]), -3);
});

test("rejects an empty array", () => {
  assert.throws(() => maxSubArray([]), RangeError);
});
