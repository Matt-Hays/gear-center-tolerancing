import { compareAbsoluteDelta, createDerivedValue, createTraceStep, decimal } from '@/lib/calculations/common';
import {
  getNormalizedAngleDeg,
  getNormalizedCount,
  getNormalizedLengthMm,
  getNormalizedRatio
} from '@/lib/calculations/normalize';
import type { GeometrySolveRequest, GeometrySolveResult, HelicalGeometry, ValidationIssue } from '@/types/domain';

const MODULE_TOLERANCE_MM = 0.01;
const DIAMETRAL_PITCH_TOLERANCE = 0.02;
const PITCH_DIAMETER_TOLERANCE_MM = 0.05;
const OUTSIDE_DIAMETER_TOLERANCE_MM = 0.05;

export function solveHelicalGeometry(request: GeometrySolveRequest): GeometrySolveResult<HelicalGeometry> {
  const issues: ValidationIssue[] = [];
  const derivedValues = [];
  const traceSteps = [];
  const missingMeasurements = [];

  const toothCount = getNormalizedCount(request.measurements, 'toothCount');
  const helixAngleDeg = getNormalizedAngleDeg(request.measurements, 'helixAngleDeg');
  const outsideDiameterMm = getNormalizedLengthMm(request.measurements, 'outsideDiameter');
  const moduleInputMm = getNormalizedLengthMm(request.measurements, 'moduleMetric');
  const diametralPitchInput = getNormalizedRatio(request.measurements, 'diametralPitch');
  const pitchDiameterKnownMm = getNormalizedLengthMm(request.measurements, 'pitchDiameterKnown');
  const pressureAngleDeg = getNormalizedAngleDeg(request.measurements, 'pressureAngleDeg');

  if (toothCount === undefined) {
    missingMeasurements.push('toothCount');
  }

  if (helixAngleDeg === undefined) {
    missingMeasurements.push('helixAngleDeg');
  }

  if (helixAngleDeg !== undefined && helixAngleDeg <= 0) {
    issues.push({
      code: 'invalid-helix-angle',
      field: 'helixAngleDeg',
      severity: 'error',
      message: 'Helix angle must be greater than zero for the helical solver.'
    });
  }

  let transverseModuleMm: number | undefined;
  let branchId = 'helical.unknown';
  let equationId = 'G-HEL-UNKNOWN';
  let equation = '';
  let detail = '';

  if (request.pathwayId === 'replicate-from-od') {
    if (outsideDiameterMm === undefined) {
      missingMeasurements.push('outsideDiameter');
    }

    if (toothCount !== undefined && outsideDiameterMm !== undefined && helixAngleDeg !== undefined) {
      const cosine = Math.cos((helixAngleDeg * Math.PI) / 180);
      transverseModuleMm = decimal(outsideDiameterMm).div(decimal(toothCount).plus(decimal(2).mul(cosine))).toNumber();
      branchId = 'helical.replicate-from-od';
      equationId = 'G-HEL-OD-01';
      equation = 'm_t = d_a / (z + 2 cos beta); m_n = m_t cos beta; d = z m_t; L = pi d / tan beta';
      detail =
        'Reconstruct the transverse and normal helical pitch systems from outside diameter, tooth count, and helix angle.';
    }
  } else {
    branchId = 'helical.direct-pitch';
    equationId = 'G-HEL-DIRECT-01';
    equation = 'm_t = input module or 25.4 / P_d; m_n = m_t cos beta; d = z m_t; d_a = d + 2 m_n';
    detail = 'Use a known transverse module or diametral pitch and transform to the normal helical system.';

    if (moduleInputMm !== undefined) {
      transverseModuleMm = moduleInputMm;
    } else if (diametralPitchInput !== undefined) {
      transverseModuleMm = decimal(25.4).div(diametralPitchInput).toNumber();
    }
  }

  if (transverseModuleMm === undefined || toothCount === undefined || helixAngleDeg === undefined) {
    return {
      solverId: 'helical',
      pathwayId: request.pathwayId,
      status: 'blocked',
      missingMeasurements: Array.from(new Set(missingMeasurements)),
      issues,
      derivedValues,
      traceSteps
    };
  }

  const helixAngleRad = (helixAngleDeg * Math.PI) / 180;
  const cosine = Math.cos(helixAngleRad);
  const tangent = Math.tan(helixAngleRad);
  const normalModuleMm = decimal(transverseModuleMm).mul(cosine).toNumber();
  const pitchDiameterMm = decimal(transverseModuleMm).mul(toothCount).toNumber();
  const outsideDiameterSolvedMm = decimal(pitchDiameterMm).plus(decimal(normalModuleMm).mul(2)).toNumber();
  const transverseCircularPitchMm = decimal(transverseModuleMm).mul(Math.PI).toNumber();
  const normalCircularPitchMm = decimal(normalModuleMm).mul(Math.PI).toNumber();
  const transverseDiametralPitch = decimal(25.4).div(transverseModuleMm).toNumber();
  const leadMm = decimal(Math.PI).mul(pitchDiameterMm).div(tangent).toNumber();

  if (moduleInputMm !== undefined && compareAbsoluteDelta(moduleInputMm, transverseModuleMm) > MODULE_TOLERANCE_MM) {
    issues.push({
      code: 'module-crosscheck-mismatch',
      field: 'moduleMetric',
      severity: 'warning',
      message: `Known transverse module differs from the reconstructed helical module by ${compareAbsoluteDelta(moduleInputMm, transverseModuleMm).toFixed(3)} mm.`
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
    compareAbsoluteDelta(outsideDiameterMm, outsideDiameterSolvedMm) > OUTSIDE_DIAMETER_TOLERANCE_MM &&
    request.pathwayId === 'direct-pitch'
  ) {
    issues.push({
      code: 'outside-diameter-crosscheck-mismatch',
      field: 'outsideDiameter',
      severity: 'warning',
      message: `Outside diameter differs from the direct-pitch helical prediction by ${compareAbsoluteDelta(outsideDiameterMm, outsideDiameterSolvedMm).toFixed(3)} mm.`
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
      message: `Known pitch diameter differs from the reconstructed helical pitch diameter by ${compareAbsoluteDelta(pitchDiameterKnownMm, pitchDiameterMm).toFixed(3)} mm.`
    });
  }

  const sourceMeasurementKeys =
    request.pathwayId === 'replicate-from-od'
      ? ['toothCount', 'outsideDiameter', 'helixAngleDeg']
      : ['toothCount', 'moduleMetric', 'diametralPitch', 'helixAngleDeg'];

  const outputs = [
    createDerivedValue({
      key: 'helical.transverseModuleMm',
      label: 'Transverse module',
      value: transverseModuleMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.normalModuleMm',
      label: 'Normal module',
      value: normalModuleMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.transverseDiametralPitch',
      label: 'Transverse diametral pitch',
      value: transverseDiametralPitch,
      unit: 'ratio',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.pitchDiameterMm',
      label: 'Pitch diameter',
      value: pitchDiameterMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.outsideDiameterMm',
      label: 'Outside diameter',
      value: outsideDiameterSolvedMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.transverseCircularPitchMm',
      label: 'Transverse circular pitch',
      value: transverseCircularPitchMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.normalCircularPitchMm',
      label: 'Normal circular pitch',
      value: normalCircularPitchMm,
      unit: 'mm',
      source: request.pathwayId,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'helical.leadMm',
      label: 'Lead',
      value: leadMm,
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
      id: 'helical-geometry',
      title: 'Solve helical pitch system',
      detail,
      reference: 'Standard external helical gear geometry',
      equation,
      equationId,
      branchId,
      outputs
    })
  );

  return {
    solverId: 'helical',
    pathwayId: request.pathwayId,
    status: 'solved',
    geometry: {
      family: 'helical',
      toothCount,
      helixAngleDeg,
      transverseModuleMm,
      normalModuleMm,
      transverseDiametralPitch,
      pitchDiameterMm,
      outsideDiameterMm: outsideDiameterSolvedMm,
      transverseCircularPitchMm,
      normalCircularPitchMm,
      leadMm,
      pressureAngleDeg
    },
    missingMeasurements: [],
    issues,
    derivedValues,
    traceSteps
  };
}
