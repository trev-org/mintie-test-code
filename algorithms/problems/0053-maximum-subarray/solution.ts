export function maxSubArray(nums: readonly number[]): number {
  if (nums.length === 0) {
    throw new RangeError("nums must not be empty");
  }

  let bestEndingHere = nums[0]!;
  let bestOverall = nums[0]!;
  for (let index = 1; index < nums.length; index += 1) {
    const value = nums[index]!;
    bestEndingHere = Math.max(value, bestEndingHere + value);
    bestOverall = Math.max(bestOverall, bestEndingHere);
  }
  return bestOverall;
}
