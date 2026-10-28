export function binarySearch(nums: readonly number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    const value = nums[middle]!;
    if (value === target) return middle;
    if (value < target) left = middle + 1;
    else right = middle - 1;
  }

  return -1;
}
