import { getMeasurementDefinition } from '@/data/measurementCatalog';
import { createDerivedValue } from '@/lib/calculations/common';
import { isLengthUnit, toMillimeters } from '@/lib/units';
import type {
  DerivedValue,
  MeasurementKey,
  MeasurementRecord,
  MeasurementValue,
  NormalizedMeasurementSet
} from '@/types/domain';

export function normalizeMeasurementRecord(record: MeasurementRecord): MeasurementValue | undefined {
  const definition = getMeasurementDefinition(record.key);
  if (!definition || record.value === undefined) {
    return undefined;
  }

  if (definition.dimension === 'length' && isLengthUnit(record.unit)) {
    return {
      key: record.key,
      label: record.label,
      dimension: 'length',
      rawValue: record.value,
      rawUnit: record.unit,
      canonicalValue: toMillimeters(record.value, record.unit),
      canonicalUnit: 'mm',
      method: record.method,
      instrument: record.instrument,
      uncertainty: record.uncertainty,
      notes: record.notes
    };
  }

  if (definition.dimension === 'angle') {
    return {
      key: record.key,
      label: record.label,
      dimension: 'angle',
      rawValue: record.value,
      rawUnit: record.unit,
      canonicalValue: record.value,
      canonicalUnit: 'deg',
      method: record.method,
      instrument: record.instrument,
      uncertainty: record.uncertainty,
      notes: record.notes
    };
  }

  if (definition.dimension === 'count') {
    return {
      key: record.key,
      label: record.label,
      dimension: 'count',
      rawValue: record.value,
      rawUnit: record.unit,
      canonicalValue: record.value,
      canonicalUnit: 'count',
      method: record.method,
      instrument: record.instrument,
      uncertainty: record.uncertainty,
      notes: record.notes
    };
  }

  return {
    key: record.key,
    label: record.label,
    dimension: 'ratio',
    rawValue: record.value,
    rawUnit: record.unit,
    canonicalValue: record.value,
    canonicalUnit: 'ratio',
    method: record.method,
    instrument: record.instrument,
    uncertainty: record.uncertainty,
    notes: record.notes
  };
}

export function normalizeMeasurementSet(measurements: MeasurementRecord[]): NormalizedMeasurementSet {
  return Object.fromEntries(
    measurements
      .map((record) => normalizeMeasurementRecord(record))
      .filter((record): record is MeasurementValue => record !== undefined)
      .map((record) => [record.key, record])
  ) as NormalizedMeasurementSet;
}

export function getNormalizedLengthMm(measurements: NormalizedMeasurementSet, key: MeasurementKey) {
  const measurement = measurements[key];
  return measurement?.dimension === 'length' ? measurement.canonicalValue : undefined;
}

export function getNormalizedAngleDeg(measurements: NormalizedMeasurementSet, key: MeasurementKey) {
  const measurement = measurements[key];
  return measurement?.dimension === 'angle' ? measurement.canonicalValue : undefined;
}

export function getNormalizedCount(measurements: NormalizedMeasurementSet, key: MeasurementKey) {
  const measurement = measurements[key];
  return measurement?.dimension === 'count' ? measurement.canonicalValue : undefined;
}

export function getNormalizedRatio(measurements: NormalizedMeasurementSet, key: MeasurementKey) {
  const measurement = measurements[key];
  return measurement?.dimension === 'ratio' ? measurement.canonicalValue : undefined;
}

export function normalizedMeasurementsToDerivedValues(measurements: NormalizedMeasurementSet): DerivedValue[] {
  return Object.values(measurements).map((measurement) =>
    createDerivedValue({
      key: `${measurement.key}.normalized`,
      label: `${measurement.label} (normalized)`,
      value: measurement.canonicalValue,
      unit: measurement.canonicalUnit,
      source: 'Normalized user input',
      sourceMeasurementKeys: [measurement.key],
      equationId: 'INPUT-NORMALIZE-01',
      branchId: 'normalization'
    })
  );
}
