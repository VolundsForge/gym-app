export type WeightUnit = 'kg' | 'lbs';

export const KG_TO_LBS = 2.2046226218;

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Convert a stored kilogram value into the unit shown in the UI. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  const raw = unit === 'lbs' ? kg * KG_TO_LBS : kg;
  return roundToHalf(raw);
}

/** Convert a value typed in the current unit back to stored kilograms. */
export function displayToKg(value: number, unit: WeightUnit): number {
  if (unit === 'lbs') return value / KG_TO_LBS;
  return value;
}

export function formatWeightNumber(kg: number, unit: WeightUnit): string {
  const n = kgToDisplay(kg, unit);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatWeightNumber(kg, unit)} ${unit}`;
}

export function unitLabel(unit: WeightUnit): string {
  return unit;
}
