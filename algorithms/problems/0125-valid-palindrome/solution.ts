function isAsciiAlphanumeric(character: string): boolean {
  return /[a-z0-9]/i.test(character);
}

export function isPalindrome(input: string): boolean {
  let left = 0;
  let right = input.length - 1;

  while (left < right) {
    while (left < right && !isAsciiAlphanumeric(input.charAt(left))) left += 1;
    while (left < right && !isAsciiAlphanumeric(input.charAt(right))) right -= 1;
    if (input.charAt(left).toLowerCase() !== input.charAt(right).toLowerCase()) {
      return false;
    }
    left += 1;
    right -= 1;
  }

  return true;
}
