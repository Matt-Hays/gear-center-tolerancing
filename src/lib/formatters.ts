import type { LengthUnit, MeasurementRecord, MeasurementUnit, UnitSystem } from '@/types/domain';
import { defaultLengthUnit, fromMillimeters, isLengthUnit } from '@/lib/units';

function lengthDigits(value: number, unit: LengthUnit) {
  if (unit === 'in') {
    return Math.abs(value) >= 1 ? 4 : 5;
  }

  return Math.abs(value) >= 10 ? 3 : 4;
}

export function formatNumber(value: number, digits = 3) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

export function formatCanonicalLength(valueMm: number, unitSystem: UnitSystem) {
  const displayUnit = defaultLengthUnit(unitSystem);
  const displayValue = fromMillimeters(valueMm, displayUnit);
  return `${formatNumber(displayValue, lengthDigits(displayValue, displayUnit))} ${displayUnit}`;
}

export function formatMeasurement(value: number, unit: MeasurementUnit, unitSystem: UnitSystem) {
  if (unit === 'mm') {
    return formatCanonicalLength(value, unitSystem);
  }

  if (unit === 'um') {
    return `${formatNumber(value, value >= 10 ? 0 : value >= 5 ? 1 : 2)} um`;
  }

  if (unit === 'ratio') {
    return formatNumber(value, 4);
  }

  if (unit === 'count') {
    return formatNumber(value, 0);
  }

  return `${formatNumber(value, 3)} ${unit}`;
}

export function formatRawMeasurementValue(value: number, unit: MeasurementUnit) {
  if (isLengthUnit(unit)) {
    return `${formatNumber(value, lengthDigits(value, unit))} ${unit}`;
  }

  if (unit === 'um') {
    return `${formatNumber(value, value >= 10 ? 0 : value >= 5 ? 1 : 2)} um`;
  }

  if (unit === 'count') {
    return formatNumber(value, 0);
  }

  if (unit === 'ratio') {
    return formatNumber(value, 4);
  }

  return `${formatNumber(value, 3)} ${unit}`;
}

export function formatMeasurementRecord(record: MeasurementRecord) {
  if (record.value === undefined) {
    return 'Not provided';
  }

  return formatRawMeasurementValue(record.value, record.unit);
}

export function formatLengthMm(valueMm: number, unitSystem: UnitSystem) {
  return formatCanonicalLength(valueMm, unitSystem);
}

export function formatMicrons(valueMm: number) {
  return `${formatNumber(valueMm * 1000, 1)} um`;
}

export function formatPercent(value: number) {
  return `${formatNumber(value * 100, 2)}%`;
}
