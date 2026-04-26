import { clamp } from 'remeda';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 100;

export function normalizePositiveInt(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return clamp(Math.trunc(value), { min: 1 });
}

export function normalizePage(value: number | undefined): number {
  return normalizePositiveInt(value, DEFAULT_PAGE);
}

export function normalizeLimit(value: number | undefined): number {
  return clamp(normalizePositiveInt(value, DEFAULT_LIMIT), { max: MAX_LIMIT });
}
