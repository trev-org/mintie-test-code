const closerToOpener: Readonly<Record<string, string>> = {
  ")": "(",
  "]": "[",
  "}": "{",
};

export function isValidParentheses(input: string): boolean {
  const stack: string[] = [];

  for (const character of input) {
    const expectedOpener = closerToOpener[character];
    if (expectedOpener === undefined) {
      stack.push(character);
      continue;
    }
    if (stack.pop() !== expectedOpener) {
      return false;
    }
  }

  return stack.length === 0;
}
