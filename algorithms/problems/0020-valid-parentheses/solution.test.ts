import assert from "node:assert/strict";
import test from "node:test";
import { isValidParentheses } from "./solution.js";

test("accepts correctly nested brackets", () => {
  assert.equal(isValidParentheses("([]{})"), true);
});

test("rejects brackets closed in the wrong order", () => {
  assert.equal(isValidParentheses("([)]"), false);
});

test("accepts an empty string", () => {
  assert.equal(isValidParentheses(""), true);
});
