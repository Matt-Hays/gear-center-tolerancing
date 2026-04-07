import Decimal from 'decimal.js';
import type { LengthUnit, MeasurementRecord, MeasurementUnit, UnitSystem } from '@/types/domain';

const MM_PER_INCH = new Decimal(25.4);

export function toMillimeters(value: number, unit: LengthUnit) {
  const decimal = new Decimal(value);
  return unit === 'in' ? decimal.mul(MM_PER_INCH).toNumber() : decimal.toNumber();
}

export function fromMillimeters(valueMm: number, unit: LengthUnit) {
  const decimal = new Decimal(valueMm);
  return unit === 'in' ? decimal.div(MM_PER_INCH).toNumber() : decimal.toNumber();
}

export function defaultLengthUnit(unitSystem: UnitSystem): LengthUnit {
  return unitSystem === 'imperial' ? 'in' : 'mm';
}

export function resolveLengthRecordMm(record?: MeasurementRecord) {
  if (!record || record.value === undefined) {
    return undefined;
  }

  if (record.unit === 'in' || record.unit === 'mm') {
    return toMillimeters(record.value, record.unit);
  }

  return undefined;
}

export function convertLength(value: number, fromUnit: LengthUnit, toUnit: LengthUnit) {
  const mm = toMillimeters(value, fromUnit);
  return fromMillimeters(mm, toUnit);
}

export function isLengthUnit(unit: MeasurementUnit): unit is LengthUnit {
  return unit === 'mm' || unit === 'in';
}

export function suggestNominalSize(valueMm: number, unitSystem: UnitSystem) {
  const decimal = new Decimal(valueMm);

  if (unitSystem === 'imperial') {
    const base = decimal.div(MM_PER_INCH);
    return base.mul(16).toNearest(1).div(16).mul(MM_PER_INCH).toNumber();
  }

  const step = valueMm < 20 ? 0.25 : valueMm < 80 ? 0.5 : 1;
  return decimal.div(step).toNearest(1).mul(step).toNumber();
}
