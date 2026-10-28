import assert from "node:assert/strict";
import test from "node:test";
import { floodFill } from "./solution.js";

test("recolors the connected component", () => {
  const image = [[1, 1, 1], [1, 1, 0], [1, 0, 1]];
  assert.deepEqual(floodFill(image, 1, 1, 2), [[2, 2, 2], [2, 2, 0], [2, 0, 1]]);
});

test("does nothing when the replacement matches", () => {
  const image = [[0, 0], [0, 0]];
  assert.equal(floodFill(image, 0, 0, 0), image);
});

test("handles an empty image", () => {
  assert.deepEqual(floodFill([], 0, 0, 1), []);
});
