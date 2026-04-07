import type { MeasurementKey } from '@/types/domain';

export const CENTER_TOLERANCE_RESERVE_KEYS: MeasurementKey[] = [
  'fitLocationTirReserve',
  'workholdingTirReserve',
  'measurementTirReserve',
  'processTirReserve',
  'additionalTirReserve'
];

export const CENTER_TOLERANCE_REMAINDER_EQUATION =
  'Allowable center tolerance (TIR) = max(0, FrT - fitLocationTirReserve - workholdingTirReserve - measurementTirReserve - processTirReserve - additionalTirReserve)';

export const CENTER_TOLERANCE_OFFSET_EQUATION =
  'Equivalent radial center offset = Allowable center tolerance (TIR) / 2';

export const CENTER_TOLERANCE_METHOD_STEPS = [
  'Confirm the ISO 1328-1 / ISO/TR 10064-1 inspection basis and verify that the recorded Fr reading was taken at the accepted tooth-space datum.',
  'Solve and display the rounded allowable ISO runout FrT before any shop reserve is applied.',
  'Convert each non-centering contributor into a TIR-equivalent reserve at the same centering datum and unit basis as Fr.',
  'Record the reserve value together with the method and notes that show the source and conversion used.',
  'Sum the reserve lines and subtract that total from FrT using worst-case arithmetic subtraction.',
  'If the residual is zero or negative, block release and report that no allowable center-tolerance budget remains.',
  'If the residual is positive, publish the allowable center tolerance (TIR) and the equivalent radial center offset.'
];

export const CENTER_TOLERANCE_METHOD_DEFAULTS = [
  'Use worst-case arithmetic subtraction, not RSS or any statistical combination.',
  'Do not automatically deduct mounting-face runout from FrT.',
  'Do not automatically deduct fit recommendation outputs from FrT.',
  'Do not release the center-tolerance result when a reserve value is missing, negative, or lacks traceable method notes.'
];

export function isCenterToleranceReserveKey(key: MeasurementKey) {
  return CENTER_TOLERANCE_RESERVE_KEYS.includes(key);
}
