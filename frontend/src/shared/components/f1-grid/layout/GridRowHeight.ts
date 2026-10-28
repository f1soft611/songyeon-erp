export function clampGridRowHeight(
  value: number,
  min: number,
  max: number,
): number {
  const normalizedMin = Number.isFinite(min) ? min : 40;
  const normalizedMax = Math.max(
    normalizedMin,
    Number.isFinite(max) ? max : normalizedMin,
  );
  const normalizedValue = Number.isFinite(value) ? value : normalizedMin;

  return Math.min(normalizedMax, Math.max(normalizedMin, normalizedValue));
}

export function getGridRowHeightByKey(
  current: number,
  key: string,
  min: number,
  max: number,
  step: number,
): number {
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return current;

  const direction = key === 'ArrowDown' ? 1 : -1;
  const normalizedStep = Number.isFinite(step) ? Math.abs(step) : 4;
  return clampGridRowHeight(current + direction * normalizedStep, min, max);
}
