export const clamp = (
  value: number,
  min = 0,
  max = 100
): number => {
  return Math.min(
    Math.max(value, min),
    max
  );
};