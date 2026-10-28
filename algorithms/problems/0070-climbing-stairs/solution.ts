export function climbStairs(steps: number): number {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RangeError("steps must be a positive integer");
  }
  if (steps <= 2) return steps;

  let twoStepsBack = 1;
  let oneStepBack = 2;
  for (let current = 3; current <= steps; current += 1) {
    [twoStepsBack, oneStepBack] = [oneStepBack, twoStepsBack + oneStepBack];
  }
  return oneStepBack;
}
