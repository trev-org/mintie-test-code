export function floodFill(
  image: number[][],
  startRow: number,
  startColumn: number,
  replacement: number,
): number[][] {
  const original = image[startRow]?.[startColumn];
  if (original === undefined || original === replacement) return image;

  const stack: Array<[number, number]> = [[startRow, startColumn]];
  const directions: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (stack.length > 0) {
    const [row, column] = stack.pop()!;
    if (image[row]?.[column] !== original) continue;
    image[row]![column] = replacement;
    for (const [rowOffset, columnOffset] of directions) {
      stack.push([row + rowOffset, column + columnOffset]);
    }
  }

  return image;
}
