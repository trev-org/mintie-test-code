import assert from "node:assert/strict";
import test from "node:test";
import { binarySearch } from "./solution.js";

test("finds a target in a sorted array", () => {
  assert.equal(binarySearch([-1, 0, 3, 5, 9, 12], 9), 4);
});

test("returns -1 for a missing target", () => {
  assert.equal(binarySearch([-1, 0, 3, 5, 9, 12], 2), -1);
});

test("handles an empty array", () => {
  assert.equal(binarySearch([], 1), -1);
});
