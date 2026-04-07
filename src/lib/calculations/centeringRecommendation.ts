import { getCenteringStandardsBasis, validateCenteringStandardsBasis } from '@/data/standardsProfiles';
import { createDerivedValue, createTraceStep, decimal } from '@/lib/calculations/common';
import { getNormalizedLengthMm } from '@/lib/calculations/normalize';
import { formatLengthMm, formatMeasurement } from '@/lib/formatters';
import {
  CENTER_TOLERANCE_METHOD_DEFAULTS,
  CENTER_TOLERANCE_OFFSET_EQUATION,
  CENTER_TOLERANCE_REMAINDER_EQUATION,
  CENTER_TOLERANCE_RESERVE_KEYS
} from '@/lib/guides/centerToleranceBudget';
import type {
  AnalysisProject,
  CenteringResult,
  DerivedValue,
  GeometrySolveResult,
  HelicalGeometry,
  MeasurementKey,
  NormalizedMeasurementSet,
  RackPinionGeometry,
  SpurGeometry,
  StandardsProfile,
  SupportedGeometry,
  TraceStep,
  ValidationIssue
} from '@/types/domain';

interface CenteringRecommendationResult {
  centeringResult?: CenteringResult;
  derivedValues: DerivedValue[];
  traceSteps: TraceStep[];
  issues: ValidationIssue[];
}

interface GeometryBasis {
  family: SupportedGeometry['family'];
  toothCount: number;
  pitchDiameterMm: number;
  outsideDiameterMm: number;
  normalModuleMm: number;
  helixAngleDeg?: number;
  pitchRadiusMm?: number;
  outsideRadiusMm?: number;
  addendumMm?: number;
  centerHeightFromRackPitchLineMm?: number;
  rackLinearPitchMm?: number;
  governingGeometryBasis: string;
  inspectionChecks: string[];
  machiningNotes: string[];
}

interface ReserveBudgetLine {
  key: MeasurementKey;
  label: string;
  valueMm?: number;
  method: string;
  notes: string;
}

function isFinitePositive(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function trimmedText(value?: string) {
  return value?.trim() ?? '';
}

function buildReserveBudgetLines(project: AnalysisProject, measurements: NormalizedMeasurementSet): ReserveBudgetLine[] {
  return CENTER_TOLERANCE_RESERVE_KEYS.map((key) => {
    const record = project.measurements.find((measurement) => measurement.key === key);

    return {
      key,
      label: record?.label ?? key,
      valueMm: getNormalizedLengthMm(measurements, key),
      method: trimmedText(record?.method),
      notes: trimmedText(record?.notes)
    };
  });
}

function iso1328RoundUm(valueUm: number) {
  const magnitude = Math.abs(valueUm);

  if (magnitude > 10) {
    return decimal(valueUm).toNearest(1).toNumber();
  }

  if (magnitude >= 5) {
    return decimal(valueUm).mul(2).toNearest(1).div(2).toNumber();
  }

  return decimal(valueUm).mul(10).toNearest(1).div(10).toNumber();
}

function calculateIso1328RunoutToleranceUm(options: {
  standardsProfile: StandardsProfile;
  centerToleranceStandard: AnalysisProject['centerToleranceStandard'];
  referenceDiameterMm: number;
  normalModuleMm: number;
  iso1328FlankToleranceClass: NonNullable<AnalysisProject['iso1328FlankToleranceClass']>;
}) {
  const basis = getCenteringStandardsBasis(options.standardsProfile, options.centerToleranceStandard);
  const formula = basis.formula;

  if (!formula) {
    throw new Error(`No formula is configured for centering basis ${basis.id}.`);
  }

  const baseTerm = decimal(formula.referenceDiameterCoeff)
    .mul(options.referenceDiameterMm)
    .plus(decimal(formula.sqrtReferenceDiameterCoeff).mul(Math.sqrt(options.referenceDiameterMm)))
    .plus(decimal(formula.normalModuleCoeff).mul(options.normalModuleMm))
    .plus(formula.constant);
  const classFactor = decimal(formula.classFactorBase).pow(
    options.iso1328FlankToleranceClass - formula.classFactorReferenceClass
  );
  const rawRunoutToleranceUm = decimal(formula.runoutFactor).mul(baseTerm).mul(classFactor).toNumber();
  const roundedRunoutToleranceUm = iso1328RoundUm(rawRunoutToleranceUm);

  return {
    roundedRunoutToleranceUm,
    roundedRunoutToleranceMm: decimal(roundedRunoutToleranceUm).div(1000).toNumber()
  };
}

function createRackBasis(project: AnalysisProject, geometry: RackPinionGeometry): GeometryBasis {
  const pitchRadiusMm = decimal(geometry.pinionPitchDiameterMm).div(2).toNumber();
  const outsideRadiusMm = decimal(geometry.pinionOutsideDiameterMm).div(2).toNumber();
  const addendumMm = decimal(outsideRadiusMm).minus(pitchRadiusMm).toNumber();

  return {
    family: 'rackPinion',
    toothCount: geometry.toothCount,
    pitchDiameterMm: geometry.pinionPitchDiameterMm,
    outsideDiameterMm: geometry.pinionOutsideDiameterMm,
    normalModuleMm: geometry.transverseModuleMm,
    pitchRadiusMm,
    outsideRadiusMm,
    addendumMm,
    centerHeightFromRackPitchLineMm: pitchRadiusMm,
    rackLinearPitchMm: geometry.rackLinearPitchMm,
    governingGeometryBasis:
      project.selectedPathwayId === 'rack-centering'
        ? 'The pinion reference diameter is reconstructed from tooth count, outside diameter, and rack linear pitch. That reference diameter and the normal module govern the reported standards quantity.'
        : 'The reconstructed pinion reference diameter governs the standards quantity. Rack linear pitch remains a cross-check unless the dedicated rack-centering path is selected.',
    inspectionChecks: [
      'Measure standards-conformant runout Fr from the accepted tooth-space datum before locating the bore center.',
      'Confirm rack linear pitch remains consistent with the reconstructed pinion circular pitch.',
      'Capture mounting-face runout as setup evidence before broaching.',
      'Verify the finished bore axis stays within the resolved allowable center tolerance after broaching.'
    ],
    machiningNotes: [
      project.selectedPathwayId === 'rack-centering'
        ? 'This is the dedicated rack-and-pinion center-before-broach workflow.'
        : 'Rack and pinion machining release remains blocked unless the dedicated rack-centering path is used.',
      'The standards result is normative. Setup readings and the internal center-tolerance reserve budget must be evaluated separately.',
      'Mounting-face runout is retained as setup evidence and is not treated as the same normative tolerance quantity as Fr.'
    ]
  };
}

function createSpurBasis(geometry: SpurGeometry): GeometryBasis {
  return {
    family: 'spur',
    toothCount: geometry.toothCount,
    pitchDiameterMm: geometry.pitchDiameterMm,
    outsideDiameterMm: geometry.outsideDiameterMm,
    normalModuleMm: geometry.transverseModuleMm,
    governingGeometryBasis:
      'The spur gear reference diameter is reconstructed from tooth count and the selected pitch-system pathway. The standards quantity uses that reference diameter together with normal module.',
    inspectionChecks: [
      'Measure standards-conformant runout Fr from the tooth-space datum before boring or broaching the hub.',
      'Capture mounting-face runout as setup evidence before machining.',
      'Verify the finished bore remains within the resolved allowable center tolerance after broaching.'
    ],
    machiningNotes: [
      'The standards result is the released standards gate for centering acceptance.',
      'Setup evidence and the internal center-tolerance reserve budget remain separate from the normative standards quantity.'
    ]
  };
}

function createHelicalBasis(geometry: HelicalGeometry): GeometryBasis {
  return {
    family: 'helical',
    toothCount: geometry.toothCount,
    pitchDiameterMm: geometry.pitchDiameterMm,
    outsideDiameterMm: geometry.outsideDiameterMm,
    normalModuleMm: geometry.normalModuleMm,
    helixAngleDeg: geometry.helixAngleDeg,
    governingGeometryBasis:
      'The helical reference diameter comes from the transverse system, while the reported standards quantity uses the solved normal module and the selected flank tolerance class.',
    inspectionChecks: [
      'Measure standards-conformant runout Fr from intact tooth spaces after establishing the helical datum.',
      'Capture mounting-face runout as setup evidence before locating bore center.',
      'Verify the finished bore remains within the resolved allowable center tolerance after broaching.'
    ],
    machiningNotes: [
      'The centering calculation uses normal module, not transverse module, for the standards quantity.',
      'Keep the helix-angle reference used in the calculation packet with the setup notes.'
    ]
  };
}

function resolveGeometryBasis(project: AnalysisProject, geometry: SupportedGeometry): GeometryBasis {
  if (geometry.family === 'rackPinion') {
    return createRackBasis(project, geometry);
  }

  if (geometry.family === 'helical') {
    return createHelicalBasis(geometry);
  }

  return createSpurBasis(geometry);
}

function getSetupEvidenceComplete(project: AnalysisProject, measurements: NormalizedMeasurementSet) {
  const hasMountingFaceRunout = getNormalizedLengthMm(measurements, 'mountingFaceRunout') !== undefined;
  const hasRackPitch =
    project.gearFamily !== 'rackPinion' || getNormalizedLengthMm(measurements, 'rackLinearPitch') !== undefined;

  return hasMountingFaceRunout && hasRackPitch;
}

function buildReleaseBlockReasons(options: {
  project: AnalysisProject;
  setupEvidenceComplete: boolean;
  standardsAcceptancePass: boolean;
  standardsRunoutMethodConfirmed: boolean;
  basisValidationStatus: CenteringResult['standardsValidationStatus'];
  legacyRunoutMethodConfirmationRequired: boolean;
  centerToleranceBudgetComplete: boolean;
  centerToleranceBudgetConfirmed: boolean;
  allowableCenterToleranceTirMm?: number;
}) {
  const reasons: string[] = [];

  if (options.basisValidationStatus !== 'approved') {
    reasons.push('The selected standards basis remains provisional and is not approved for release use.');
  }

  if (!options.standardsRunoutMethodConfirmed) {
    reasons.push('The standards runout measurement method has not been confirmed.');
  }

  if (options.legacyRunoutMethodConfirmationRequired) {
    reasons.push('A migrated legacy runout value still requires confirmation against the approved standards method.');
  }

  if (!options.setupEvidenceComplete) {
    reasons.push('Required setup evidence is incomplete.');
  }

  if (!options.standardsAcceptancePass) {
    reasons.push('The measured standards runout exceeds the allowable standards quantity.');
  }

  if (!options.centerToleranceBudgetComplete) {
    reasons.push('The reserve-budget worksheet is incomplete, invalid, or missing traceable reserve notes.');
  } else if ((options.allowableCenterToleranceTirMm ?? 0) <= 0) {
    reasons.push('The reserve budget consumes the full allowable ISO runout FrT. No allowable center tolerance remains.');
  }

  if (!options.centerToleranceBudgetConfirmed) {
    reasons.push('The reserve-budget worksheet has not been confirmed in the release checklist.');
  }

  return reasons;
}

export function solveRackPinionCentering(options: {
  project: AnalysisProject;
  geometryResult?: GeometrySolveResult;
  measurements: NormalizedMeasurementSet;
  standardsProfile: StandardsProfile;
}): CenteringRecommendationResult {
  const derivedValues: DerivedValue[] = [];
  const traceSteps: TraceStep[] = [];
  const issues: ValidationIssue[] = [];

  const geometry = options.geometryResult?.geometry as SupportedGeometry | undefined;
  if (!geometry) {
    return {
      centeringResult: undefined,
      derivedValues,
      traceSteps,
      issues
    };
  }

  const standardsBasis = getCenteringStandardsBasis(options.standardsProfile, options.project.centerToleranceStandard);
  issues.push(...validateCenteringStandardsBasis(options.standardsProfile, options.project.centerToleranceStandard));

  const isoClass = options.project.iso1328FlankToleranceClass;
  if (isoClass === undefined) {
    issues.push({
      code: 'missing-iso1328-flank-class',
      severity: 'error',
      message:
        options.project.legacyCenteringAudit?.legacyAgmaQQualityNumber !== undefined
          ? 'Legacy AGMA Q data was preserved for audit, but you must explicitly select an ISO flank tolerance class before the standards quantity can be issued.'
          : 'Select an ISO flank tolerance class before the standards quantity can be issued.'
    });

    return {
      centeringResult: undefined,
      derivedValues,
      traceSteps,
      issues
    };
  }

  if (!standardsBasis.classNumbers.includes(isoClass)) {
    issues.push({
      code: 'unsupported-iso1328-flank-class',
      severity: 'error',
      message: `ISO flank tolerance class ${isoClass} is not available in the selected standards basis.`
    });

    return {
      centeringResult: undefined,
      derivedValues,
      traceSteps,
      issues
    };
  }

  if (!standardsBasis.formula) {
    return {
      centeringResult: undefined,
      derivedValues,
      traceSteps,
      issues
    };
  }

  const basis = resolveGeometryBasis(options.project, geometry);
  const faceWidthMm = getNormalizedLengthMm(options.measurements, 'faceWidth');
  const runoutFrMeasuredMm = getNormalizedLengthMm(options.measurements, 'runoutFrMeasured');
  const mountingFaceRunoutMm = getNormalizedLengthMm(options.measurements, 'mountingFaceRunout');
  const setupEvidenceComplete = getSetupEvidenceComplete(options.project, options.measurements);
  const standardsRunoutMethodConfirmed = options.project.releaseChecklistState.standardsRunoutMethodConfirmed;
  const legacyRunoutMethodConfirmationRequired =
    options.project.legacyCenteringAudit?.migratedRunoutFrFromToothDatum === true && !standardsRunoutMethodConfirmed;

  if (!isFinitePositive(basis.pitchDiameterMm)) {
    issues.push({
      code: 'invalid-reference-diameter',
      severity: 'error',
      message: 'The standards reference diameter must be finite and greater than zero before a standards quantity can be issued.'
    });
  }

  if (!isFinitePositive(basis.normalModuleMm)) {
    issues.push({
      code: 'invalid-normal-module',
      severity: 'error',
      message: 'Normal module must be finite and greater than zero before a standards quantity can be issued.'
    });
  }

  if (!Number.isInteger(basis.toothCount) || basis.toothCount <= 0) {
    issues.push({
      code: 'invalid-tooth-count',
      severity: 'error',
      field: 'toothCount',
      message: 'Tooth count must be a whole number greater than zero.'
    });
  }

  if (faceWidthMm !== undefined && !isFinitePositive(faceWidthMm)) {
    issues.push({
      code: 'invalid-face-width',
      severity: 'error',
      field: 'faceWidth',
      message: 'Face width must be finite and greater than zero when provided.'
    });
  }

  const applicability = standardsBasis.applicability;

  if (basis.toothCount < applicability.toothCount.min || basis.toothCount > applicability.toothCount.max) {
    issues.push({
      code: 'iso1328-tooth-count-out-of-scope',
      severity: 'error',
      field: 'toothCount',
      message: `The selected standards basis supports tooth counts from ${applicability.toothCount.min} to ${applicability.toothCount.max}.`
    });
  }

  if (
    basis.pitchDiameterMm < applicability.referenceDiameterMm.min ||
    basis.pitchDiameterMm > applicability.referenceDiameterMm.max
  ) {
    issues.push({
      code: 'iso1328-reference-diameter-out-of-scope',
      severity: 'error',
      message: `The selected standards basis supports reference diameters from ${applicability.referenceDiameterMm.min} to ${applicability.referenceDiameterMm.max} mm.`
    });
  }

  if (basis.normalModuleMm < applicability.normalModuleMm.min || basis.normalModuleMm > applicability.normalModuleMm.max) {
    issues.push({
      code: 'iso1328-normal-module-out-of-scope',
      severity: 'error',
      message: `The selected standards basis supports normal modules from ${applicability.normalModuleMm.min} to ${applicability.normalModuleMm.max} mm.`
    });
  }

  if (
    faceWidthMm !== undefined &&
    (faceWidthMm < applicability.faceWidthMm.min || faceWidthMm > applicability.faceWidthMm.max)
  ) {
    issues.push({
      code: 'iso1328-face-width-out-of-scope',
      severity: 'error',
      field: 'faceWidth',
      message: `The selected standards basis supports face widths from ${applicability.faceWidthMm.min} to ${applicability.faceWidthMm.max} mm.`
    });
  }

  if (basis.helixAngleDeg !== undefined && Math.abs(basis.helixAngleDeg) > applicability.helixAngleAbsDeg.max) {
    issues.push({
      code: 'iso1328-helix-angle-out-of-scope',
      severity: 'error',
      field: 'helixAngleDeg',
      message: `The selected standards basis supports absolute helix angles up to ${applicability.helixAngleAbsDeg.max} deg.`
    });
  }

  if (runoutFrMeasuredMm === undefined) {
    issues.push({
      code: 'missing-runout-fr-measurement',
      severity: 'error',
      field: 'runoutFrMeasured',
      message: 'Measured standards-conformant runout Fr is required before the standards quantity can be issued.'
    });
  } else if (!isFiniteNonNegative(runoutFrMeasuredMm)) {
    issues.push({
      code: 'invalid-runout-fr-input',
      severity: 'error',
      field: 'runoutFrMeasured',
      message: 'Measured standards-conformant runout Fr must be a finite value greater than or equal to zero.'
    });
  }

  if (mountingFaceRunoutMm === undefined) {
    issues.push({
      code: 'centering-setup-evidence-insufficient',
      severity: 'error',
      field: 'mountingFaceRunout',
      message: 'Mounting-face runout is required as setup evidence before the centering packet can clear review.'
    });
  } else if (!isFiniteNonNegative(mountingFaceRunoutMm)) {
    issues.push({
      code: 'invalid-mounting-face-runout-input',
      severity: 'error',
      field: 'mountingFaceRunout',
      message: 'Measured mounting-face runout must be a finite value greater than or equal to zero.'
    });
  }

  if (options.project.gearFamily === 'rackPinion' && getNormalizedLengthMm(options.measurements, 'rackLinearPitch') === undefined) {
    issues.push({
      code: 'centering-setup-evidence-insufficient',
      severity: 'error',
      field: 'rackLinearPitch',
      message: 'Rack linear pitch is required as supporting evidence for rack-and-pinion centering.'
    });
  }

  if (!standardsRunoutMethodConfirmed) {
    issues.push({
      code: 'standards-runout-method-confirmation-required',
      severity: 'warning',
      field: 'runoutFrMeasured',
      message: standardsBasis.measurementMethodNote
    });
  }

  if (legacyRunoutMethodConfirmationRequired) {
    issues.push({
      code: 'measurement-method-confirmation-required',
      severity: 'warning',
      field: 'runoutFrMeasured',
      message:
        'This runout value was migrated from a legacy tooth-datum reading. Confirm that the recorded method is equivalent to the approved standards runout method before release.'
    });
  }

  if (issues.some((issue) => issue.severity === 'error')) {
    return {
      centeringResult: undefined,
      derivedValues,
      traceSteps,
      issues
    };
  }

  const tolerance = calculateIso1328RunoutToleranceUm({
    standardsProfile: options.standardsProfile,
    centerToleranceStandard: options.project.centerToleranceStandard,
    referenceDiameterMm: basis.pitchDiameterMm,
    normalModuleMm: basis.normalModuleMm,
    iso1328FlankToleranceClass: isoClass
  });
  const allowableRunoutFrTMm = tolerance.roundedRunoutToleranceMm;
  const standardsAcceptancePass = (runoutFrMeasuredMm ?? Number.POSITIVE_INFINITY) <= allowableRunoutFrTMm;
  const reserveBudgetLines = buildReserveBudgetLines(options.project, options.measurements);
  const reserveBudgetIssues: ValidationIssue[] = [];

  reserveBudgetLines.forEach((line) => {
    if (line.valueMm === undefined) {
      reserveBudgetIssues.push({
        code: 'missing-center-tolerance-reserve',
        severity: 'error',
        field: line.key,
        message: `${line.label} is required before the allowable center tolerance can be resolved.`
      });
      return;
    }

    if (!isFiniteNonNegative(line.valueMm)) {
      reserveBudgetIssues.push({
        code: 'invalid-center-tolerance-reserve',
        severity: 'error',
        field: line.key,
        message: `${line.label} must be a finite TIR-equivalent value greater than or equal to zero.`
      });
      return;
    }

    if (line.method.length === 0) {
      reserveBudgetIssues.push({
        code: 'center-tolerance-reserve-method-required',
        severity: 'error',
        field: line.key,
        message: `${line.label} requires a recorded conversion method before the allowable center tolerance can be released.`
      });
    }

    if (line.notes.length === 0) {
      reserveBudgetIssues.push({
        code: 'center-tolerance-reserve-notes-required',
        severity: 'error',
        field: line.key,
        message: `${line.label} requires notes describing the reserve source and TIR conversion.`
      });
    }
  });

  issues.push(...reserveBudgetIssues);

  const centerToleranceBudgetComplete = reserveBudgetIssues.length === 0;
  const reserveBudgetTotalTirMm = centerToleranceBudgetComplete
    ? reserveBudgetLines.reduce((sum, line) => sum.plus(line.valueMm ?? 0), decimal(0)).toNumber()
    : undefined;
  const allowableCenterToleranceTirMm =
    reserveBudgetTotalTirMm !== undefined
      ? Math.max(0, decimal(allowableRunoutFrTMm).minus(reserveBudgetTotalTirMm).toNumber())
      : undefined;
  const equivalentRadialOffsetMm =
    allowableCenterToleranceTirMm !== undefined
      ? decimal(allowableCenterToleranceTirMm).div(2).toNumber()
      : undefined;
  const centerToleranceBudgetConfirmed = options.project.releaseChecklistState.centerToleranceBudgetConfirmed;

  if (!standardsAcceptancePass) {
    issues.push({
      code: 'standards-runout-acceptance-failed',
      severity: 'error',
      field: 'runoutFrMeasured',
      message: 'Measured standards-conformant runout Fr exceeds the allowable standards quantity for the selected ISO flank tolerance class.'
    });
  }

  if (centerToleranceBudgetComplete && (allowableCenterToleranceTirMm ?? 0) <= 0) {
    issues.push({
      code: 'allowable-center-tolerance-exhausted',
      severity: 'error',
      message: 'The reserve budget consumes the full allowable ISO runout FrT. No allowable center tolerance remains.'
    });
  }

  const releaseBlockReasons = buildReleaseBlockReasons({
    project: options.project,
    setupEvidenceComplete,
    standardsAcceptancePass,
    standardsRunoutMethodConfirmed,
    basisValidationStatus: standardsBasis.validation.status,
    legacyRunoutMethodConfirmationRequired,
    centerToleranceBudgetComplete,
    centerToleranceBudgetConfirmed,
    allowableCenterToleranceTirMm
  });

  const branchId = `centering.${geometry.family}.${options.project.selectedPathwayId}`;
  const equationId = standardsBasis.formula.equationId;
  const sourceMeasurementKeys: MeasurementKey[] =
    geometry.family === 'rackPinion'
      ? ['toothCount', 'outsideDiameter', 'rackLinearPitch', 'runoutFrMeasured', 'mountingFaceRunout']
      : geometry.family === 'helical'
        ? ['toothCount', 'outsideDiameter', 'moduleMetric', 'diametralPitch', 'helixAngleDeg', 'runoutFrMeasured', 'mountingFaceRunout']
        : ['toothCount', 'outsideDiameter', 'moduleMetric', 'diametralPitch', 'runoutFrMeasured', 'mountingFaceRunout'];
  const sourceWithoutMeasuredRunout = sourceMeasurementKeys.filter(
    (key) => key !== 'runoutFrMeasured' && key !== 'mountingFaceRunout'
  ) as MeasurementKey[];

  const standardsOutputs: DerivedValue[] = [
    createDerivedValue({
      key: 'centering.referenceDiameterMm',
      label: 'Standards reference diameter',
      value: basis.pitchDiameterMm,
      unit: 'mm',
      source: basis.family,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'centering.normalModuleMm',
      label: 'Standards normal module',
      value: basis.normalModuleMm,
      unit: 'mm',
      source: basis.family,
      sourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'centering.iso1328FlankToleranceClass',
      label: 'ISO flank tolerance class',
      value: isoClass,
      unit: 'count',
      source: standardsBasis.standardCode,
      sourceMeasurementKeys: sourceWithoutMeasuredRunout,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'centering.allowableRunoutFrTUm',
      label: standardsBasis.quantityName,
      value: tolerance.roundedRunoutToleranceUm,
      unit: 'um',
      source: standardsBasis.quantityReference,
      sourceMeasurementKeys: sourceWithoutMeasuredRunout,
      equationId,
      branchId,
      roundingRule: standardsBasis.rounding.description
    }),
    createDerivedValue({
      key: 'centering.runoutFrMeasuredMm',
      label: 'Recorded standards-conformant runout Fr',
      value: runoutFrMeasuredMm ?? 0,
      unit: 'mm',
      source: 'Measured standards evidence',
      sourceMeasurementKeys: ['runoutFrMeasured'],
      equationId: 'CENTER-MEASURE-ISO-01',
      branchId
    }),
    createDerivedValue({
      key: 'centering.mountingFaceRunoutMm',
      label: 'Recorded mounting-face runout',
      value: mountingFaceRunoutMm ?? 0,
      unit: 'mm',
      source: 'Measured setup evidence',
      sourceMeasurementKeys: ['mountingFaceRunout'],
      equationId: 'CENTER-MEASURE-ISO-02',
      branchId
    })
  ];

  if (basis.centerHeightFromRackPitchLineMm !== undefined) {
    standardsOutputs.push(
      createDerivedValue({
        key: 'centering.centerHeightFromRackPitchLineMm',
        label: 'Center height from rack pitch line',
        value: basis.centerHeightFromRackPitchLineMm,
        unit: 'mm',
        source: 'Rack and pinion geometry',
        sourceMeasurementKeys: ['toothCount', 'outsideDiameter', 'rackLinearPitch'],
        equationId: 'CENTER-RACK-HEIGHT-01',
        branchId
      })
    );
  }

  const reserveBudgetOutputs: DerivedValue[] = reserveBudgetLines
    .filter((line) => line.valueMm !== undefined)
    .map((line) =>
      createDerivedValue({
        key: `centering.${line.key}`,
        label: line.label,
        value: line.valueMm ?? 0,
        unit: 'mm',
        source: 'Engineer-entered reserve budget',
        sourceMeasurementKeys: [line.key],
        equationId: 'CENTER-TOLERANCE-BUDGET-INPUT',
        branchId
      })
    );

  if (reserveBudgetTotalTirMm !== undefined) {
    reserveBudgetOutputs.push(
      createDerivedValue({
        key: 'centering.reserveBudgetTotalTirMm',
        label: 'Total reserve budget (TIR)',
        value: reserveBudgetTotalTirMm,
        unit: 'mm',
        source: standardsBasis.internalAppliedLimit.note,
        sourceMeasurementKeys: [...CENTER_TOLERANCE_RESERVE_KEYS],
        equationId: standardsBasis.internalAppliedLimit.equationId,
        branchId
      })
    );
  }

  if (allowableCenterToleranceTirMm !== undefined) {
    reserveBudgetOutputs.push(
      createDerivedValue({
        key: 'centering.allowableCenterToleranceTirMm',
        label: standardsBasis.internalAppliedLimit.label,
        value: allowableCenterToleranceTirMm,
        unit: 'mm',
        source: standardsBasis.internalAppliedLimit.note,
        sourceMeasurementKeys: [...CENTER_TOLERANCE_RESERVE_KEYS],
        equationId: standardsBasis.internalAppliedLimit.equationId,
        branchId
      })
    );
  }

  if (equivalentRadialOffsetMm !== undefined) {
    reserveBudgetOutputs.push(
      createDerivedValue({
        key: 'centering.equivalentRadialOffsetMm',
        label: 'Equivalent radial center offset',
        value: equivalentRadialOffsetMm,
        unit: 'mm',
        source: 'Derived helper from the resolved allowable center tolerance',
        sourceMeasurementKeys: [...CENTER_TOLERANCE_RESERVE_KEYS],
        equationId: 'CENTER-TOLERANCE-BUDGET-02',
        branchId
      })
    );
  }

  derivedValues.push(...standardsOutputs, ...reserveBudgetOutputs);
  traceSteps.push(
    createTraceStep({
      id: 'standards-centering-quantity',
      title: 'Issue standards-based centering quantity',
      detail: `Use the reconstructed reference diameter and normal module with ISO flank tolerance class ${isoClass} to calculate ${standardsBasis.quantitySymbol}, then round in micrometres per ${standardsBasis.rounding.mode}. The standards quantity remains normative and separate from the reserve-budget center-tolerance worksheet.`,
      reference: `${standardsBasis.standardCode} | ${standardsBasis.sourceReference}`,
      equation: standardsBasis.formula.expression,
      equationId,
      branchId,
      outputs: standardsOutputs
    })
  );

  if (reserveBudgetOutputs.length) {
    traceSteps.push(
      createTraceStep({
        id: 'center-tolerance-budget',
        title: 'Resolve allowable center tolerance from reserve budget',
        detail: centerToleranceBudgetComplete
          ? 'Subtract the explicit TIR-equivalent reserve total from the normative ISO runout FrT using worst-case arithmetic subtraction, then divide by two to report the equivalent radial offset.'
          : 'Record every reserve line with a TIR-equivalent value, method, and notes before the allowable center tolerance can be resolved.',
        reference: `${standardsBasis.standardCode} | ${standardsBasis.internalAppliedLimit.note}`,
        equation: `${CENTER_TOLERANCE_REMAINDER_EQUATION}; ${CENTER_TOLERANCE_OFFSET_EQUATION}`,
        equationId: standardsBasis.internalAppliedLimit.equationId,
        branchId,
        outputs: reserveBudgetOutputs
      })
    );
  }

  const boreCenterBasis =
    allowableCenterToleranceTirMm !== undefined
      ? allowableCenterToleranceTirMm > 0
        ? 'The allowable center tolerance is the residual TIR budget after subtracting explicit reserve lines from the normative ISO runout FrT. This residual is an internal engineering method layered on the standards quantity, not a direct ISO output.'
        : 'The reserve worksheet is complete, but the summed reserve lines consume the full ISO runout FrT. No allowable center tolerance remains for release.'
      : 'The app is reporting the normative ISO runout FrT, but the reserve-budget worksheet is still incomplete or missing traceable reserve notes, so the final allowable center tolerance cannot be resolved yet.';
  const toleranceBasisReference =
    reserveBudgetTotalTirMm !== undefined
      ? `${standardsBasis.standardCode} | ${standardsBasis.quantityName} | Class ${isoClass} | d = ${basis.pitchDiameterMm.toFixed(3)} mm | mn = ${basis.normalModuleMm.toFixed(3)} mm | Reserve total = ${reserveBudgetTotalTirMm.toFixed(3)} mm TIR`
      : `${standardsBasis.standardCode} | ${standardsBasis.quantityName} | Class ${isoClass} | d = ${basis.pitchDiameterMm.toFixed(3)} mm | mn = ${basis.normalModuleMm.toFixed(3)} mm | Reserve budget incomplete`;

  return {
    centeringResult: {
      family: basis.family,
      headline: 'Center before broach',
      governingGeometryBasis: basis.governingGeometryBasis,
      boreCenterBasis,
      standardsBasisId: standardsBasis.id,
      standardsBasisLabel: standardsBasis.standardCode,
      standardsValidationStatus: standardsBasis.validation.status,
      standardsValidationArtifactPath: standardsBasis.validation.artifactPath,
      standardsQuantityName: standardsBasis.quantityName,
      standardsQuantitySymbol: standardsBasis.quantitySymbol,
      standardsClauseReference: standardsBasis.clauseReference,
      referenceDiameterMm: basis.pitchDiameterMm,
      pitchDiameterMm: basis.pitchDiameterMm,
      outsideDiameterMm: basis.outsideDiameterMm,
      normalModuleMm: basis.normalModuleMm,
      allowableRunoutFrTUm: tolerance.roundedRunoutToleranceUm,
      allowableRunoutFrTMm,
      allowableRunoutFrTDisplay: formatMeasurement(tolerance.roundedRunoutToleranceUm, 'um', options.project.unitSystem),
      appliedCenteringLimitStatus: standardsBasis.internalAppliedLimit.status,
      allowableCenterToleranceTirMm,
      allowableCenterToleranceDisplay:
        allowableCenterToleranceTirMm !== undefined
          ? formatLengthMm(allowableCenterToleranceTirMm, options.project.unitSystem)
          : undefined,
      reserveBudgetTotalTirMm,
      equivalentRadialOffsetMm,
      iso1328FlankToleranceClass: isoClass,
      toleranceBasisReference,
      acceptanceModeNote: standardsBasis.engineeringAcceptanceNote,
      standardsAcceptancePass,
      setupEvidenceComplete,
      standardsRunoutMethodConfirmed,
      legacyRunoutMethodConfirmationRequired,
      centerToleranceBudgetComplete,
      centerToleranceBudgetConfirmed,
      releaseBlockReasons,
      centerHeightFromRackPitchLineMm: basis.centerHeightFromRackPitchLineMm,
      pitchRadiusMm: basis.pitchRadiusMm,
      outsideRadiusMm: basis.outsideRadiusMm,
      addendumMm: basis.addendumMm,
      rackLinearPitchMm: basis.rackLinearPitchMm,
      recordedRunoutFrMm: runoutFrMeasuredMm,
      recordedMountingFaceRunoutMm: mountingFaceRunoutMm,
      inspectionChecks: basis.inspectionChecks,
      machiningNotes: [
        ...basis.machiningNotes,
        standardsBasis.internalAppliedLimit.note,
        ...CENTER_TOLERANCE_METHOD_DEFAULTS,
        standardsBasis.validation.note
      ]
    },
    derivedValues,
    traceSteps,
    issues
  };
}
