export function twoSum(nums: readonly number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();

  for (let index = 0; index < nums.length; index += 1) {
    const value = nums[index]!;
    const complementIndex = seen.get(target - value);
    if (complementIndex !== undefined) {
      return [complementIndex, index];
    }
    seen.set(value, index);
  }

  return null;
}
