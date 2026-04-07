import {
  compareAbsoluteDelta,
  createDerivedValue,
  createTraceStep,
  decimal
} from '@/lib/calculations/common';
import {
  getNormalizedLengthMm
} from '@/lib/calculations/normalize';
import { formatLengthMm } from '@/lib/formatters';
import { suggestNominalSize } from '@/lib/units';
import type {
  AnalysisProject,
  DerivedValue,
  FitDefinition,
  GeometrySolveResult,
  KeySizeDefinition,
  NormalizedMeasurementSet,
  StandardsProfile,
  ToleranceRecommendation,
  TraceStep,
  ValidationIssue
} from '@/types/domain';

interface FitRecommendationResult {
  recommendation?: ToleranceRecommendation;
  derivedValues: DerivedValue[];
  traceSteps: TraceStep[];
  issues: ValidationIssue[];
  usedSuggestedNominal: boolean;
}

function lookupFitBand(fit: FitDefinition, nominalSizeMm: number) {
  return fit.bands.find((band) => nominalSizeMm >= band.minDiameterMm && nominalSizeMm <= band.maxDiameterMm);
}

type KeyTableSystem = 'imperial' | 'metric';

interface KeyCandidate {
  system: KeyTableSystem;
  definition: KeySizeDefinition;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  widthToleranceMm: number;
  depthToleranceMm: number;
}

interface SelectedKeyCandidate extends KeyCandidate {
  selectionBasis: 'measured-key-evidence' | 'nominal-system-heuristic' | 'project-unit-fallback';
}

function lookupKeyDefinition(profile: StandardsProfile, nominalSizeMm: number, system: KeyTableSystem) {
  const table = system === 'imperial' ? profile.keyDefinitions.imperial : profile.keyDefinitions.metric;
  const lookupValue = system === 'imperial' ? nominalSizeMm / 25.4 : nominalSizeMm;

  return table.find((record) => lookupValue >= record.minShaft && lookupValue <= record.maxShaft);
}

function createKeyCandidate(system: KeyTableSystem, definition: KeySizeDefinition): KeyCandidate {
  const unitFactor = definition.unit === 'in' ? 25.4 : 1;

  return {
    system,
    definition,
    widthMm: definition.width * unitFactor,
    heightMm: definition.height * unitFactor,
    depthMm: definition.hubKeyseatDepth * unitFactor,
    widthToleranceMm: definition.widthTolerance * unitFactor,
    depthToleranceMm: definition.depthTolerance * unitFactor
  };
}

function scoreKeyCandidate(
  candidate: KeyCandidate,
  existingKeyWidthMm?: number,
  existingKeyDepthMm?: number
) {
  let score = 0;

  if (existingKeyWidthMm !== undefined) {
    score += compareAbsoluteDelta(existingKeyWidthMm, candidate.widthMm);
  }

  if (existingKeyDepthMm !== undefined) {
    score += compareAbsoluteDelta(existingKeyDepthMm, candidate.depthMm);
  }

  return score;
}

function inferPreferredKeySystemFromNominal(nominalSizeMm: number): KeyTableSystem | undefined {
  const nominalSizeIn = nominalSizeMm / 25.4;
  const nearestSixteenthIn = Math.round(nominalSizeIn * 16) / 16;
  const nearestWholeMm = Math.round(nominalSizeMm);
  const inchResidualMm = Math.abs(nominalSizeIn - nearestSixteenthIn) * 25.4;
  const metricResidualMm = Math.abs(nominalSizeMm - nearestWholeMm);

  if (inchResidualMm < 0.01 && inchResidualMm + 0.01 < metricResidualMm) {
    return 'imperial';
  }

  if (metricResidualMm < 0.01 && metricResidualMm + 0.01 < inchResidualMm) {
    return 'metric';
  }

  return undefined;
}

function selectKeyDefinition(options: {
  profile: StandardsProfile;
  nominalSizeMm: number;
  project: AnalysisProject;
  existingKeyWidthMm?: number;
  existingKeyDepthMm?: number;
}): SelectedKeyCandidate | undefined {
  const imperial = lookupKeyDefinition(options.profile, options.nominalSizeMm, 'imperial');
  const metric = lookupKeyDefinition(options.profile, options.nominalSizeMm, 'metric');
  const candidates = [
    imperial ? createKeyCandidate('imperial', imperial) : undefined,
    metric ? createKeyCandidate('metric', metric) : undefined
  ].filter((candidate): candidate is KeyCandidate => candidate !== undefined);

  if (candidates.length === 0) {
    return undefined;
  }

  if (
    candidates.length > 1 &&
    (options.existingKeyWidthMm !== undefined || options.existingKeyDepthMm !== undefined)
  ) {
    const scored = candidates
      .map((candidate) => ({
        candidate,
        score: scoreKeyCandidate(candidate, options.existingKeyWidthMm, options.existingKeyDepthMm)
      }))
      .sort((left, right) => left.score - right.score);

    return {
      ...scored[0].candidate,
      selectionBasis: 'measured-key-evidence'
    };
  }

  if (candidates.length > 1) {
    const preferredSystem = inferPreferredKeySystemFromNominal(options.nominalSizeMm);
    if (preferredSystem) {
      return {
        ...candidates.find((candidate) => candidate.system === preferredSystem)!,
        selectionBasis: 'nominal-system-heuristic'
      };
    }
  }

  const fallbackSystem = options.project.unitSystem === 'imperial' ? 'imperial' : 'metric';
  return {
    ...candidates.find((candidate) => candidate.system === fallbackSystem) ?? candidates[0],
    selectionBasis: 'project-unit-fallback'
  };
}

function compareExistingToRecommended(
  issues: ValidationIssue[],
  existing: number,
  recommended: number,
  tolerance: number,
  field: 'existingKeyWidth' | 'existingKeyDepthHub',
  label: string
) {
  const delta = compareAbsoluteDelta(existing, recommended);

  if (delta > tolerance) {
    issues.push({
      code: `${field}-mismatch`,
      field,
      severity: 'warning',
      message: `${label} differs from the recommendation by ${delta.toFixed(3)} mm.`
    });
  }
}

function recommendationBranchId(project: AnalysisProject) {
  return project.shaftInterface === 'keyed' ? 'fit.keyed' : `fit.interference.${project.dutyClass}`;
}

export function solveFitRecommendation(options: {
  project: AnalysisProject;
  geometryResult?: GeometrySolveResult;
  measurements: NormalizedMeasurementSet;
  standardsProfile: StandardsProfile;
}): FitRecommendationResult {
  const { project, measurements, standardsProfile } = options;
  const derivedValues: DerivedValue[] = [];
  const traceSteps: TraceStep[] = [];
  const issues: ValidationIssue[] = [];
  const branchId = recommendationBranchId(project);

  const shaftDiameterMm = getNormalizedLengthMm(measurements, 'shaftDiameterMeasured');
  const boreDiameterMm = getNormalizedLengthMm(measurements, 'boreDiameterMeasured');
  const nominalShaftSizeMm = getNormalizedLengthMm(measurements, 'nominalShaftSize');
  const existingKeyWidthMm = getNormalizedLengthMm(measurements, 'existingKeyWidth');
  const existingKeyDepthMm = getNormalizedLengthMm(measurements, 'existingKeyDepthHub');

  let effectiveNominalMm = nominalShaftSizeMm;
  let usedSuggestedNominal = false;

  if (effectiveNominalMm === undefined && shaftDiameterMm !== undefined) {
    effectiveNominalMm = suggestNominalSize(shaftDiameterMm, project.unitSystem);
    usedSuggestedNominal = true;
    issues.push({
      code: 'nominal-size-suggested',
      field: 'nominalShaftSize',
      severity: 'warning',
      message: `Nominal shaft size is missing. Suggested base size is ${formatLengthMm(effectiveNominalMm, project.unitSystem)} and must be confirmed before approval.`
    });
  }

  if (effectiveNominalMm === undefined) {
    return {
      recommendation: undefined,
      derivedValues,
      traceSteps,
      issues,
      usedSuggestedNominal
    };
  }

  const fit =
    project.shaftInterface === 'keyed'
      ? standardsProfile.fitDefinitions.keyed
      : standardsProfile.fitDefinitions.interferenceByDuty[project.dutyClass];
  const band = lookupFitBand(fit, effectiveNominalMm);

  if (!band) {
    issues.push({
      code: 'fit-band-missing',
      severity: 'error',
      message: `No fit data band is available for ${effectiveNominalMm.toFixed(3)} mm.`
    });

    return {
      recommendation: undefined,
      derivedValues,
      traceSteps,
      issues,
      usedSuggestedNominal
    };
  }

  const boreMinMm = decimal(effectiveNominalMm).plus(decimal(band.holeLowerUm).div(1000)).toNumber();
  const boreMaxMm = decimal(effectiveNominalMm).plus(decimal(band.holeUpperUm).div(1000)).toNumber();
  const interfaceMinMm =
    project.shaftInterface === 'keyed'
      ? decimal(band.holeLowerUm).minus(band.shaftUpperUm).div(1000).toNumber()
      : decimal(band.shaftLowerUm).minus(band.holeUpperUm).div(1000).toNumber();
  const interfaceMaxMm =
    project.shaftInterface === 'keyed'
      ? decimal(band.holeUpperUm).minus(band.shaftLowerUm).div(1000).toNumber()
      : decimal(band.shaftUpperUm).minus(band.holeLowerUm).div(1000).toNumber();

  const equationId = `FIT-${fit.code.replace('/', '-')}`;
  const fitSourceMeasurementKeys =
    usedSuggestedNominal && nominalShaftSizeMm === undefined ? ['shaftDiameterMeasured'] : ['nominalShaftSize'];
  const recommendationNotes = [
    `Reference pack: ${standardsProfile.basisLabel} ${standardsProfile.basisVersion}.`,
    `Hole basis ${fit.holeBasis} with mating shaft class ${fit.shaftBasis}.`,
    standardsProfile.provisional
      ? 'Built-in standards tables remain configurable defaults and must be checked against approved internal standards before production release.'
      : standardsProfile.releaseNote
  ];

  const outputs: DerivedValue[] = [
    createDerivedValue({
      key: 'fit.nominalSizeMm',
      label: 'Nominal shaft size',
      value: effectiveNominalMm,
      unit: 'mm',
      source: fit.code,
      sourceMeasurementKeys: usedSuggestedNominal ? ['shaftDiameterMeasured'] : ['nominalShaftSize'],
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'fit.recommendedBoreMinMm',
      label: 'Recommended bore minimum',
      value: boreMinMm,
      unit: 'mm',
      source: fit.code,
      sourceMeasurementKeys: fitSourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'fit.recommendedBoreMaxMm',
      label: 'Recommended bore maximum',
      value: boreMaxMm,
      unit: 'mm',
      source: fit.code,
      sourceMeasurementKeys: fitSourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'fit.expectedInterfaceMinMm',
      label: project.shaftInterface === 'keyed' ? 'Expected clearance minimum' : 'Expected interference minimum',
      value: interfaceMinMm,
      unit: 'mm',
      source: fit.code,
      sourceMeasurementKeys: fitSourceMeasurementKeys,
      equationId,
      branchId
    }),
    createDerivedValue({
      key: 'fit.expectedInterfaceMaxMm',
      label: project.shaftInterface === 'keyed' ? 'Expected clearance maximum' : 'Expected interference maximum',
      value: interfaceMaxMm,
      unit: 'mm',
      source: fit.code,
      sourceMeasurementKeys: fitSourceMeasurementKeys,
      equationId,
      branchId
    })
  ];

  if (shaftDiameterMm !== undefined && boreDiameterMm !== undefined) {
    const currentRelationshipMm =
      project.shaftInterface === 'keyed'
        ? decimal(boreDiameterMm).minus(shaftDiameterMm).toNumber()
        : decimal(shaftDiameterMm).minus(boreDiameterMm).toNumber();

    outputs.push(
      createDerivedValue({
        key: 'fit.currentMeasuredRelationshipMm',
        label:
          project.shaftInterface === 'keyed'
            ? 'Current measured clearance'
            : 'Current measured interference',
        value: currentRelationshipMm,
        unit: 'mm',
        source: 'Measured shaft and bore',
        sourceMeasurementKeys: ['boreDiameterMeasured', 'shaftDiameterMeasured'],
        equationId: 'FIT-MEASURED-RELATIONSHIP-01',
        branchId
      })
    );

    if (currentRelationshipMm < interfaceMinMm || currentRelationshipMm > interfaceMaxMm) {
      issues.push({
        code:
          project.shaftInterface === 'keyed'
            ? 'current-clearance-outside-band'
            : 'current-interference-outside-band',
        severity: 'warning',
        message:
          project.shaftInterface === 'keyed'
            ? 'The current measured shaft-to-bore clearance sits outside the selected keyed fit band.'
            : 'The current measured shaft-to-bore interference sits outside the selected fit band.'
      });
    }
  }

  const recommendation: ToleranceRecommendation = {
    status: 'draft',
    headline:
      project.shaftInterface === 'keyed'
        ? 'Keyed bore fit'
        : `${project.dutyClass[0].toUpperCase()}${project.dutyClass.slice(1)} interference fit`,
    fitCode: fit.code,
    fitIntent: fit.intent,
    nominalSizeMm: effectiveNominalMm,
    recommendedBoreMinMm: boreMinMm,
    recommendedBoreMaxMm: boreMaxMm,
    expectedInterfaceMinMm: interfaceMinMm,
    expectedInterfaceMaxMm: interfaceMaxMm,
    holeBasis: fit.holeBasis,
    shaftBasis: fit.shaftBasis,
    notes: recommendationNotes
  };

  if (project.shaftInterface === 'keyed') {
    const keyCandidate = selectKeyDefinition({
      profile: standardsProfile,
      nominalSizeMm: effectiveNominalMm,
      project,
      existingKeyWidthMm,
      existingKeyDepthMm
    });

    if (!keyCandidate) {
      issues.push({
        code: 'key-definition-missing',
        severity: 'error',
        message: `No key size definition is available for ${formatLengthMm(effectiveNominalMm, project.unitSystem)}.`
      });
    } else {
      const keySourceMeasurementKeys = ['nominalShaftSize'];
      if (existingKeyWidthMm !== undefined) {
        keySourceMeasurementKeys.push('existingKeyWidth');
      }
      if (existingKeyDepthMm !== undefined) {
        keySourceMeasurementKeys.push('existingKeyDepthHub');
      }

      if (keyCandidate.selectionBasis === 'project-unit-fallback') {
        issues.push({
          code: 'key-standard-fallback',
          severity: 'warning',
          message:
            'Key standard family could not be inferred from measured evidence and fell back to the project unit setting. Review the selected key dimensions before release.'
        });
      }

      recommendationNotes.push(
        keyCandidate.selectionBasis === 'measured-key-evidence'
          ? `Key dimensions selected from the ${keyCandidate.system} key table using measured keyway evidence.`
          : keyCandidate.selectionBasis === 'nominal-system-heuristic'
            ? `Key dimensions selected from the ${keyCandidate.system} key table using the confirmed nominal size system heuristic.`
            : `Key dimensions selected from the ${keyCandidate.system} key table by project-unit fallback.`
      );

      outputs.push(
        createDerivedValue({
          key: 'fit.keyWidthMm',
          label: 'Recommended key width',
          value: keyCandidate.widthMm,
          unit: 'mm',
          source: `${keyCandidate.system} key table`,
          sourceMeasurementKeys: keySourceMeasurementKeys,
          equationId: 'KEY-TABLE-01',
          branchId
        }),
        createDerivedValue({
          key: 'fit.keyHeightMm',
          label: 'Recommended key height',
          value: keyCandidate.heightMm,
          unit: 'mm',
          source: `${keyCandidate.system} key table`,
          sourceMeasurementKeys: keySourceMeasurementKeys,
          equationId: 'KEY-TABLE-01',
          branchId
        }),
        createDerivedValue({
          key: 'fit.hubKeywayDepthMm',
          label: 'Recommended hub keyway depth',
          value: keyCandidate.depthMm,
          unit: 'mm',
          source: `${keyCandidate.system} key table`,
          sourceMeasurementKeys: keySourceMeasurementKeys,
          equationId: 'KEY-TABLE-01',
          branchId
        })
      );

      if (existingKeyWidthMm !== undefined) {
        compareExistingToRecommended(
          issues,
          existingKeyWidthMm,
          keyCandidate.widthMm,
          keyCandidate.widthToleranceMm * 1.5,
          'existingKeyWidth',
          'Measured key width'
        );
      }

      if (existingKeyDepthMm !== undefined) {
        compareExistingToRecommended(
          issues,
          existingKeyDepthMm,
          keyCandidate.depthMm,
          keyCandidate.depthToleranceMm * 1.5,
          'existingKeyDepthHub',
          'Measured hub keyway depth'
        );
      }

      recommendation.keyWidth = keyCandidate.widthMm;
      recommendation.keyHeight = keyCandidate.heightMm;
      recommendation.keywayHubDepth = keyCandidate.depthMm;
      recommendation.keywayWidthTolerance = keyCandidate.widthToleranceMm;
      recommendation.keywayDepthTolerance = keyCandidate.depthToleranceMm;
    }
  }

  derivedValues.push(...outputs);
  traceSteps.push(
    createTraceStep({
      id: 'fit-recommendation',
      title: project.shaftInterface === 'keyed' ? 'Select keyed fit and keyway' : 'Select interference fit',
      detail:
        project.shaftInterface === 'keyed'
          ? 'Apply the selected standards profile to the confirmed nominal size and keyed hub tables.'
          : 'Apply the selected standards profile and duty class to the confirmed nominal size and interference tables.',
      reference: `${fit.code} via ${standardsProfile.name}`,
      equation:
        project.shaftInterface === 'keyed'
          ? 'Hole band from standards table; expected clearance = hole minus shaft.'
          : 'Hole band from standards table; expected interference = shaft minus hole.',
      equationId,
      branchId,
      outputs
    })
  );

  return {
    recommendation,
    derivedValues,
    traceSteps,
    issues,
    usedSuggestedNominal
  };
}
