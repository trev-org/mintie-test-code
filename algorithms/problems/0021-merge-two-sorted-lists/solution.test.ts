import assert from "node:assert/strict";
import test from "node:test";
import { fromArray, mergeTwoSortedLists, toArray } from "./solution.js";

test("merges two sorted lists", () => {
  const merged = mergeTwoSortedLists(fromArray([1, 2, 4]), fromArray([1, 3, 4]));
  assert.deepEqual(toArray(merged), [1, 1, 2, 3, 4, 4]);
});

test("handles one empty list", () => {
  assert.deepEqual(toArray(mergeTwoSortedLists(null, fromArray([0]))), [0]);
});

test("handles two empty lists", () => {
  assert.equal(mergeTwoSortedLists(null, null), null);
});
