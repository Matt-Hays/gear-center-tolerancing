import { compareAbsoluteDelta, createDerivedValue, createTraceStep, decimal } from '@/lib/calculations/common';
import {
  getNormalizedAngleDeg,
  getNormalizedCount,
  getNormalizedLengthMm,
  getNormalizedRatio
} from '@/lib/calculations/normalize';
import type { GeometrySolveRequest, GeometrySolveResult, RackPinionGeometry, ValidationIssue } from '@/types/domain';

const MODULE_TOLERANCE_MM = 0.01;
const DIAMETRAL_PITCH_TOLERANCE = 0.02;
const PITCH_DIAMETER_TOLERANCE_MM = 0.05;
const OUTSIDE_DIAMETER_TOLERANCE_MM = 0.05;
const RACK_PITCH_TOLERANCE_MM = 0.05;

export function solveRackPinionGeometry(request: GeometrySolveRequest): GeometrySolveResult<RackPinionGeometry> {
  const issues: ValidationIssue[] = [];
  const derivedValues = [];
  const traceSteps = [];
  const missingMeasurements = [];

  const toothCount = getNormalizedCount(request.measurements, 'toothCount');
  const outsideDiameterMm = getNormalizedLengthMm(request.measurements, 'outsideDiameter');
  const rackLinearPitchMmInput = getNormalizedLengthMm(request.measurements, 'rackLinearPitch');
  const moduleInputMm = getNormalizedLengthMm(request.measurements, 'moduleMetric');
  const diametralPitchInput = getNormalizedRatio(request.measurements, 'diametralPitch');
  const pitchDiameterKnownMm = getNormalizedLengthMm(request.measurements, 'pitchDiameterKnown');
  const pressureAngleDeg = getNormalizedAngleDeg(request.measurements, 'pressureAngleDeg');

  if (toothCount === undefined) {
    missingMeasurements.push('toothCount');
  }

  let transverseModuleMm: number | undefined;
  let branchId = 'rack-pinion.unknown';
  let equationId = 'G-RACK-UNKNOWN';
  let equation = '';
  let detail = '';

  if (request.pathwayId === 'replicate-from-od' || request.pathwayId === 'rack-centering') {
    if (outsideDiameterMm === undefined) {
      missingMeasurements.push('outsideDiameter');
    }

    if (toothCount !== undefined && outsideDiameterMm !== undefined) {
      transverseModuleMm = decimal(outsideDiameterMm).div(decimal(toothCount).plus(2)).toNumber();
      branchId =
        request.pathwayId === 'rack-centering' ? 'rack-pinion.rack-centering' : 'rack-pinion.replicate-from-od';
      equationId = request.pathwayId === 'rack-centering' ? 'G-RACK-CENTER-01' : 'G-RACK-OD-01';
      equation = 'm_t = d_a / (z + 2); d = z m_t; p_rack = pi m_t';
      detail =
        request.pathwayId === 'rack-centering'
          ? 'Reconstruct the pinion pitch system from outside diameter, then verify the rack pitch before building the center-before-broach packet.'
          : 'Reconstruct the pinion pitch system from outside diameter and map the result onto the mating rack pitch.';
    }
  } else {
    branchId = 'rack-pinion.direct-pitch';
    equationId = 'G-RACK-DIRECT-01';
    equation = 'm_t = input module or 25.4 / P_d; d = z m_t; d_a = m_t (z + 2); p_rack = pi m_t';
    detail = 'Use a known pinion transverse module or diametral pitch and derive the matching rack linear pitch.';

    if (moduleInputMm !== undefined) {
      transverseModuleMm = moduleInputMm;
    } else if (diametralPitchInput !== undefined) {
      transverseModuleMm = decimal(25.4).div(diametralPitchInput).toNumber();
    }
  }

  if (transverseModuleMm === undefined || toothCount === undefined) {
    return {
      solverId: 'rackPinion',
      pathwayId: request.pathwayId,
      status: 'blocked',
      missingMeasurements: Array.from(new Set(missingMeasurements)),
      issues,
      derivedValues,
      traceSteps
    };
  }

  const pinionPitchDiameterMm = decimal(transverseModuleMm).mul(toothCount).toNumber();
  const pinionOutsideDiameterMm = decimal(transverseModuleMm).mul(decimal(toothCount).plus(2)).toNumber();
  const circularPitchMm = decimal(transverseModuleMm).mul(Math.PI).toNumber();
  const transverseDiametralPitch = decimal(25.4).div(transverseModuleMm).toNumber();
  const rackLinearPitchMm = circularPitchMm;

  if (moduleInputMm !== undefined && compareAbsoluteDelta(moduleInputMm, transverseModuleMm) > MODULE_TOLERANCE_MM) {
    issues.push({
      code: 'module-crosscheck-mismatch',
      field: 'moduleMetric',
      severity: 'warning',
      message: `Known transverse module differs from the reconstructed rack-pinion module by ${compareAbsoluteDelta(moduleInputMm, transverseModuleMm).toFixed(3)} mm.`
    });
  }

  if (
    diametralPitchInput !== undefined &&
    compareAbsoluteDelta(diametralPitchInput, transverseDiametralPitch) > DIAMETRAL_PITCH_TOLERANCE
  ) {
    issues.push({
      code: 'diametral-pitch-crosscheck-mismatch',
      field: 'diametralPitch',
      severity: 'warning',
      message: `Known transverse diametral pitch differs from the reconstructed value by ${compareAbsoluteDelta(diametralPitchInput, transverseDiametralPitch).toFixed(4)}.`
    });
  }

  if (
    outsideDiameterMm !== undefined &&
    compareAbsoluteDelta(outsideDiameterMm, pinionOutsideDiameterMm) > OUTSIDE_DIAMETER_TOLERANCE_MM &&
    request.pathwayId === 'direct-pitch'
  ) {
    issues.push({
      code: 'outside-diameter-crosscheck-mismatch',
      field: 'outsideDiameter',
      severity: 'warning',
      message: `Outside diameter differs from the rack-pinion direct-pitch prediction by ${compareAbsoluteDelta(outsideDiameterMm, pinionOutsideDiameterMm).toFixed(3)} mm.`
    });
  }

  if (
    pitchDiameterKnownMm !== undefined &&
    compareAbsoluteDelta(pitchDiameterKnownMm, pinionPitchDiameterMm) > PITCH_DIAMETER_TOLERANCE_MM
  ) {
    issues.push({
      code: 'pitch-diameter-crosscheck-mismatch',
      field: 'pitchDiameterKnown',
      severity: 'warning',
      message: `Known pinion pitch diameter differs from the reconstructed value by ${compareAbsoluteDelta(pitchDiameterKnownMm, pinionPitchDiameterMm).toFixed(3)} mm.`
    });
  }

  if (
    rackLinearPitchMmInput !== undefined &&
    compareAbsoluteDelta(rackLinearPitchMmInput, rackLinearPitchMm) > RACK_PITCH_TOLERANCE_MM
  ) {
    issues.push({
      code: 'rack-linear-pitch-crosscheck-mismatch',
      field: 'rackLinearPitch',
      severity: 'warning',
      message: `Measured rack linear pitch differs from the reconstructed rack pitch by ${compareAbsoluteDelta(rackLinearPitchMmInput, rackLinearPitchMm).toFixed(3)} mm.`
    });
  }

  const sourceMeasurementKeys =
    request.pathwayId === 'replicate-from-od' || request.pathwayId === 'rack-centering'
      ? request.pathwayId === 'rack-centering'
        ? ['toothCount', 'outsideDiameter', 'rackLinearPitch']
        : ['toothCount', 'outsideDiameter']
      : ['toothCount', 'moduleMetric', 'diametralPitch'];

  const outputs = [
    createDerivedValue({
      key: 'rack-pinion.transverseModuleMm',
      label: 'Pinion transverse module',
      value: transverseModuleMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'rack-pinion.transverseDiametralPitch',
      label: 'Pinion transverse diametral pitch',
      value: transverseDiametralPitch,
      unit: 'ratio',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'rack-pinion.pinionPitchDiameterMm',
      label: 'Pinion pitch diameter',
      value: pinionPitchDiameterMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'rack-pinion.pinionOutsideDiameterMm',
      label: 'Pinion outside diameter',
      value: pinionOutsideDiameterMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'rack-pinion.circularPitchMm',
      label: 'Pinion circular pitch',
      value: circularPitchMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'rack-pinion.rackLinearPitchMm',
      label: 'Rack linear pitch',
      value: rackLinearPitchMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    })
  ];

  derivedValues.push(...outputs);
  traceSteps.push(
    createTraceStep({
      id: 'rack-pinion-geometry',
      title: 'Solve rack and pinion pitch system',
      detail,
      reference: 'Standard rack and pinion equivalence',
      equation,
      equationId,
      branchId,
      outputs
    })
  );

  return {
    solverId: 'rackPinion',
    pathwayId: request.pathwayId,
    status: 'solved',
    geometry: {
      family: 'rackPinion',
      toothCount,
      transverseModuleMm,
      transverseDiametralPitch,
      pinionPitchDiameterMm,
      pinionOutsideDiameterMm,
      circularPitchMm,
      rackLinearPitchMm,
      pressureAngleDeg
    },
    missingMeasurements: [],
    issues,
    derivedValues,
    traceSteps
  };
}
