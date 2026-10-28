import assert from "node:assert/strict";
import test from "node:test";
import { twoSum } from "./solution.js";

test("finds a pair in one pass", () => {
  assert.deepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);
});

test("uses two distinct indexes for duplicate values", () => {
  assert.deepEqual(twoSum([3, 3], 6), [0, 1]);
});

test("handles negative values", () => {
  assert.deepEqual(twoSum([-3, 4, 3, 90], 0), [0, 2]);
});

test("returns null when no pair exists", () => {
  assert.equal(twoSum([1, 2, 3], 10), null);
});
