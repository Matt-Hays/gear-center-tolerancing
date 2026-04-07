import { compareAbsoluteDelta, createDerivedValue, createTraceStep, decimal } from '@/lib/calculations/common';
import {
  getNormalizedAngleDeg,
  getNormalizedCount,
  getNormalizedLengthMm,
  getNormalizedRatio
} from '@/lib/calculations/normalize';
import type { GeometrySolveRequest, GeometrySolveResult, SpurGeometry, ValidationIssue } from '@/types/domain';

const MODULE_TOLERANCE_MM = 0.01;
const DIAMETRAL_PITCH_TOLERANCE = 0.02;
const PITCH_DIAMETER_TOLERANCE_MM = 0.05;
const OUTSIDE_DIAMETER_TOLERANCE_MM = 0.05;

export function solveSpurGeometry(request: GeometrySolveRequest): GeometrySolveResult<SpurGeometry> {
  const issues: ValidationIssue[] = [];
  const derivedValues = [];
  const traceSteps = [];
  const missingMeasurements = [];

  const toothCount = getNormalizedCount(request.measurements, 'toothCount');
  const outsideDiameterMm = getNormalizedLengthMm(request.measurements, 'outsideDiameter');
  const moduleInputMm = getNormalizedLengthMm(request.measurements, 'moduleMetric');
  const diametralPitchInput = getNormalizedRatio(request.measurements, 'diametralPitch');
  const pitchDiameterKnownMm = getNormalizedLengthMm(request.measurements, 'pitchDiameterKnown');
  const pressureAngleDeg = getNormalizedAngleDeg(request.measurements, 'pressureAngleDeg');

  if (toothCount === undefined) {
    missingMeasurements.push('toothCount');
  }

  let transverseModuleMm: number | undefined;
  let branchId = 'spur.unknown';
  let equationId = 'G-SPUR-UNKNOWN';
  let equation = '';
  let detail = '';

  if (request.pathwayId === 'replicate-from-od') {
    if (outsideDiameterMm === undefined) {
      missingMeasurements.push('outsideDiameter');
    }

    if (toothCount !== undefined && outsideDiameterMm !== undefined) {
      transverseModuleMm = decimal(outsideDiameterMm).div(decimal(toothCount).plus(2)).toNumber();
      branchId = 'spur.replicate-from-od';
      equationId = 'G-SPUR-OD-01';
      equation = 'm_t = d_a / (z + 2); d = z m_t; p = pi m_t';
      detail =
        'Reconstruct the spur pitch system from outside diameter and tooth count for a standard full-depth external gear.';
    }
  } else {
    branchId = 'spur.direct-pitch';
    equationId = 'G-SPUR-DIRECT-01';
    equation = 'm_t = input module or 25.4 / P_d; d = z m_t; d_a = m_t (z + 2); p = pi m_t';
    detail = 'Use a known transverse module or diametral pitch as the governing spur pitch-system input.';

    if (moduleInputMm !== undefined) {
      transverseModuleMm = moduleInputMm;
    } else if (diametralPitchInput !== undefined) {
      transverseModuleMm = decimal(25.4).div(diametralPitchInput).toNumber();
    }
  }

  if (transverseModuleMm === undefined || toothCount === undefined) {
    return {
      solverId: 'spur',
      pathwayId: request.pathwayId,
      status: 'blocked',
      missingMeasurements: Array.from(new Set(missingMeasurements)),
      issues,
      derivedValues,
      traceSteps
    };
  }

  const pitchDiameterMm = decimal(transverseModuleMm).mul(toothCount).toNumber();
  const outsideDiameterSolvedMm = decimal(transverseModuleMm).mul(decimal(toothCount).plus(2)).toNumber();
  const circularPitchMm = decimal(transverseModuleMm).mul(Math.PI).toNumber();
  const transverseDiametralPitch = decimal(25.4).div(transverseModuleMm).toNumber();

  if (moduleInputMm !== undefined && compareAbsoluteDelta(moduleInputMm, transverseModuleMm) > MODULE_TOLERANCE_MM) {
    issues.push({
      code: 'module-crosscheck-mismatch',
      field: 'moduleMetric',
      severity: 'warning',
      message: `Known module differs from the reconstructed module by ${compareAbsoluteDelta(moduleInputMm, transverseModuleMm).toFixed(3)} mm.`
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
      message: `Known diametral pitch differs from the reconstructed transverse diametral pitch by ${compareAbsoluteDelta(diametralPitchInput, transverseDiametralPitch).toFixed(4)}.`
    });
  }

  if (
    outsideDiameterMm !== undefined &&
    compareAbsoluteDelta(outsideDiameterMm, outsideDiameterSolvedMm) > OUTSIDE_DIAMETER_TOLERANCE_MM &&
    request.pathwayId === 'direct-pitch'
  ) {
    issues.push({
      code: 'outside-diameter-crosscheck-mismatch',
      field: 'outsideDiameter',
      severity: 'warning',
      message: `Outside diameter differs from the direct-pitch prediction by ${compareAbsoluteDelta(outsideDiameterMm, outsideDiameterSolvedMm).toFixed(3)} mm.`
    });
  }

  if (
    pitchDiameterKnownMm !== undefined &&
    compareAbsoluteDelta(pitchDiameterKnownMm, pitchDiameterMm) > PITCH_DIAMETER_TOLERANCE_MM
  ) {
    issues.push({
      code: 'pitch-diameter-crosscheck-mismatch',
      field: 'pitchDiameterKnown',
      severity: 'warning',
      message: `Known pitch diameter differs from the reconstructed spur pitch diameter by ${compareAbsoluteDelta(pitchDiameterKnownMm, pitchDiameterMm).toFixed(3)} mm.`
    });
  }

  const outputs = [
    createDerivedValue({
      key: 'spur.transverseModuleMm',
      label: 'Transverse module',
      value: transverseModuleMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys:
        request.pathwayId === 'replicate-from-od' ? ['toothCount', 'outsideDiameter'] : ['toothCount', 'moduleMetric', 'diametralPitch'],
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'spur.transverseDiametralPitch',
      label: 'Transverse diametral pitch',
      value: transverseDiametralPitch,
      unit: 'ratio',
      source: request.pathwayId,
      sourceMeasurementKeys:
        request.pathwayId === 'replicate-from-od' ? ['toothCount', 'outsideDiameter'] : ['toothCount', 'moduleMetric', 'diametralPitch'],
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'spur.pitchDiameterMm',
      label: 'Pitch diameter',
      value: pitchDiameterMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys:
        request.pathwayId === 'replicate-from-od' ? ['toothCount', 'outsideDiameter'] : ['toothCount', 'moduleMetric', 'diametralPitch'],
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'spur.outsideDiameterMm',
      label: 'Outside diameter',
      value: outsideDiameterSolvedMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys:
        request.pathwayId === 'replicate-from-od' ? ['toothCount', 'outsideDiameter'] : ['toothCount', 'moduleMetric', 'diametralPitch'],
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'spur.circularPitchMm',
      label: 'Circular pitch',
      value: circularPitchMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys:
        request.pathwayId === 'replicate-from-od' ? ['toothCount', 'outsideDiameter'] : ['toothCount', 'moduleMetric', 'diametralPitch'],
      equationId,
      branchId
    })
  ];

  derivedValues.push(...outputs);
  traceSteps.push(
    createTraceStep({
      id: 'spur-geometry',
      title: 'Solve spur pitch system',
      detail,
      reference: 'Standard external spur gear geometry',
      equation,
      equationId,
      branchId,
      outputs
    })
  );

  return {
    solverId: 'spur',
    pathwayId: request.pathwayId,
    status: 'solved',
    geometry: {
      family: 'spur',
      toothCount,
      transverseModuleMm,
      transverseDiametralPitch,
      pitchDiameterMm,
      outsideDiameterMm: outsideDiameterSolvedMm,
      circularPitchMm,
      pressureAngleDeg
    },
    missingMeasurements: [],
    issues,
    derivedValues,
    traceSteps
  };
}
