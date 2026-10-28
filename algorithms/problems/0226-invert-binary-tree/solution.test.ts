import assert from "node:assert/strict";
import test from "node:test";
import { invertTree, TreeNode } from "./solution.js";

test("mirrors every node", () => {
  const root = new TreeNode(2, new TreeNode(1), new TreeNode(3));
  const inverted = invertTree(root);
  assert.equal(inverted?.left?.value, 3);
  assert.equal(inverted?.right?.value, 1);
});

test("handles an empty tree", () => {
  assert.equal(invertTree(null), null);
});

test("leaves a single node in place", () => {
  const root = new TreeNode(1);
  assert.equal(invertTree(root), root);
});
