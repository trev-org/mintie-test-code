import assert from "node:assert/strict";
import test from "node:test";
import { isPalindrome } from "./solution.js";

test("ignores punctuation and case", () => {
  assert.equal(isPalindrome("A man, a plan, a canal: Panama"), true);
});

test("detects a non-palindrome", () => {
  assert.equal(isPalindrome("race a car"), false);
});

test("accepts an empty string", () => {
  assert.equal(isPalindrome(""), true);
});
