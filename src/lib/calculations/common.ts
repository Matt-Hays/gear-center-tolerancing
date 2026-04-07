import Decimal from 'decimal.js';
import type {
  DerivedValue,
  GearFamily,
  MeasurementKey,
  MeasurementUnit,
  TraceStep,
  UnsupportedCombinationIssue
} from '@/types/domain';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const INTERNAL_ROUNDING_RULE =
  'Full precision is retained internally; values are rounded only when rendered or exported.';

export function decimal(value: number) {
  return new Decimal(value);
}

export function createDerivedValue(options: {
  key: string;
  label: string;
  value: number;
  unit: MeasurementUnit;
  source: string;
  sourceMeasurementKeys: MeasurementKey[];
  equationId: string;
  branchId: string;
  roundingRule?: string;
}): DerivedValue {
  return {
    ...options,
    roundingRule: options.roundingRule ?? INTERNAL_ROUNDING_RULE
  };
}

export function createTraceStep(options: {
  id: string;
  title: string;
  detail: string;
  reference: string;
  equation?: string;
  equationId: string;
  branchId: string;
  outputs: DerivedValue[];
}): TraceStep {
  return options;
}

export function compareRelativeDelta(a: number, b: number) {
  if (a === 0 && b === 0) {
    return 0;
  }

  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}

export function compareAbsoluteDelta(a: number, b: number) {
  return Math.abs(a - b);
}

export function unsupportedFamilyIssue(gearFamily: GearFamily): UnsupportedCombinationIssue {
  return {
    code: 'unsupported-combination',
    unsupportedFamily: gearFamily,
    severity: 'error',
    message: `${gearFamily} calculations are not implemented in this release and are blocked explicitly instead of approximated.`
  };
}
