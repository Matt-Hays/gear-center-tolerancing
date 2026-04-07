import { getPathway } from '@/data/measurementCatalog';
import {
  getCenteringStandardsBasis,
  getStandardsProfile,
  validateCenteringStandardsBasis
} from '@/data/standardsProfiles';
import { solveRackPinionCentering } from '@/lib/calculations/centeringRecommendation';
import { createTraceStep, unsupportedFamilyIssue } from '@/lib/calculations/common';
import { solveFitRecommendation } from '@/lib/calculations/fitRecommendation';
import {
  normalizeMeasurementSet,
  normalizedMeasurementsToDerivedValues
} from '@/lib/calculations/normalize';
import { resolvePathwayRequirements } from '@/lib/calculations/pathwayResolver';
import { solveHelicalGeometry } from '@/lib/calculations/solvers/helicalSolver';
import { solveRackPinionGeometry } from '@/lib/calculations/solvers/rackPinionSolver';
import { solveSpurGeometry } from '@/lib/calculations/solvers/spurSolver';
import type {
  AnalysisProject,
  AnalysisResult,
  GearFamily,
  GeometrySolveResult,
  ReleaseChecklistItem,
  ReleaseGateStatus,
  RecommendationStatus,
  ValidationIssue
} from '@/types/domain';

function isSupportedGearFamily(gearFamily: GearFamily) {
  return gearFamily === 'spur' || gearFamily === 'helical' || gearFamily === 'rackPinion';
}

function computeStatus(
  issues: ValidationIssue[],
  missingMeasurements: string[],
  usedSuggestedNominal: boolean
): RecommendationStatus {
  if (missingMeasurements.length || issues.some((issue) => issue.severity === 'error')) {
    return 'blocked';
  }

  if (usedSuggestedNominal || issues.some((issue) => issue.severity === 'warning')) {
    return 'draft';
  }

  return 'reviewReady';
}

function dedupeIssues(issues: ValidationIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.field ?? ''}|${issue.severity}|${issue.message}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function validateEngineeringInputs(project: AnalysisProject, issues: ValidationIssue[]) {
  const isSupportedFamily =
    project.gearFamily === 'spur' || project.gearFamily === 'helical' || project.gearFamily === 'rackPinion';
  const standardsProfile = getStandardsProfile(project.standardsProfileId);
  const standardsBasis = getCenteringStandardsBasis(standardsProfile, project.centerToleranceStandard);

  const toothCount = project.measurements.find((record) => record.key === 'toothCount')?.value;
  if (toothCount !== undefined && (!Number.isInteger(toothCount) || toothCount <= 0)) {
    issues.push({
      code: 'invalid-tooth-count',
      field: 'toothCount',
      severity: 'error',
      message: 'Tooth count must be entered as a whole number greater than zero.'
    });
  }

  if (isSupportedFamily) {
    issues.push(...validateCenteringStandardsBasis(standardsProfile, project.centerToleranceStandard));
  }

  if (
    isSupportedFamily &&
    project.iso1328FlankToleranceClass !== undefined &&
    !standardsBasis.classNumbers.includes(project.iso1328FlankToleranceClass)
  ) {
    issues.push({
      code: 'unsupported-iso1328-flank-class',
      severity: 'error',
      message: `ISO flank tolerance class ${project.iso1328FlankToleranceClass} is not available in the selected standards profile.`
    });
  }
}

function buildReleaseChecklist(options: {
  project: AnalysisProject;
  normalizedMeasurements: ReturnType<typeof normalizeMeasurementSet>;
  status: RecommendationStatus;
  usedSuggestedNominal: boolean;
  standardsAcceptancePass?: boolean;
  setupEvidenceComplete?: boolean;
  standardsBasisApproved?: boolean;
  centerToleranceBudgetAvailable?: boolean;
  legacyRunoutMethodConfirmationRequired?: boolean;
  standardsRunoutMethodConfirmed?: boolean;
}): ReleaseChecklistItem[] {
  const isSupportedFamily =
    options.project.gearFamily === 'spur' ||
    options.project.gearFamily === 'helical' ||
    options.project.gearFamily === 'rackPinion';
  const isRackPinion = options.project.gearFamily === 'rackPinion';
  const nominalConfirmed =
    options.normalizedMeasurements.nominalShaftSize !== undefined && !options.usedSuggestedNominal;
  const rackCenteringPathSelected = !isRackPinion || options.project.selectedPathwayId === 'rack-centering';
  const setupEvidenceCaptured = !isSupportedFamily || options.setupEvidenceComplete === true;
  const standardsRunoutMeasured = !isSupportedFamily || options.normalizedMeasurements.runoutFrMeasured !== undefined;
  const isoClassConfirmed = !isSupportedFamily || options.project.iso1328FlankToleranceClass !== undefined;
  const standardsAcceptanceConfirmed =
    !isSupportedFamily || (standardsRunoutMeasured && options.standardsAcceptancePass === true);
  const standardsBasisApproved = !isSupportedFamily || options.standardsBasisApproved === true;
  const standardsRunoutMethodConfirmed =
    !isSupportedFamily || options.standardsRunoutMethodConfirmed === true;
  const centerToleranceBudgetAvailable =
    !isSupportedFamily || options.centerToleranceBudgetAvailable === true;
  const centerToleranceBudgetConfirmed =
    !isSupportedFamily || options.project.releaseChecklistState.centerToleranceBudgetConfirmed === true;

  return [
    {
      id: 'standards-basis-approved',
      label: 'Approved centering standards basis is active',
      complete: standardsBasisApproved,
      required: isSupportedFamily,
      note: isSupportedFamily
        ? 'Release stays blocked while the selected standards basis remains provisional, disabled, or otherwise unapproved.'
        : undefined
    },
    {
      id: 'standards-basis-confirmed',
      label: 'Published reference pack confirmed for release',
      complete: options.project.releaseChecklistState.standardsBasisConfirmed,
      required: true,
      note: 'Required before any machining packet can move beyond blocked.'
    },
    {
      id: 'iso-class-confirmed',
      label: 'ISO flank tolerance class explicitly selected',
      complete: isoClassConfirmed,
      required: isSupportedFamily,
      note: isSupportedFamily ? 'Required before the released ISO runout tolerance can be issued.' : undefined
    },
    {
      id: 'standards-runout-method',
      label: 'Standards runout method confirmed',
      complete: standardsRunoutMethodConfirmed,
      required: isSupportedFamily,
      note: options.legacyRunoutMethodConfirmationRequired
        ? 'Required because the current Fr reading was migrated from legacy tooth-datum evidence and must be confirmed against the approved standards method.'
        : isSupportedFamily
          ? 'Required before the recorded Fr reading can be relied on as the normative standards quantity.'
          : undefined
    },
    {
      id: 'nominal-size-confirmed',
      label: 'Nominal shaft size explicitly confirmed',
      complete: nominalConfirmed,
      required: true,
      note: options.usedSuggestedNominal
        ? 'Suggested nominal sizes are exploratory only and cannot clear the release gate.'
        : undefined
    },
    {
      id: 'rack-centering-path',
      label: 'Rack center-before-broach path selected',
      complete: rackCenteringPathSelected,
      required: isRackPinion,
      note: isRackPinion ? 'Rack/pinion machining release requires the dedicated centering workflow.' : undefined
    },
    {
      id: 'setup-evidence',
      label: 'Setup evidence captured',
      complete: setupEvidenceCaptured,
      required: isSupportedFamily,
      note: isRackPinion
        ? 'Requires rack linear pitch and mounting-face runout alongside the standards runout reading.'
        : isSupportedFamily
          ? 'Requires mounting-face runout as setup evidence.'
          : undefined
    },
    {
      id: 'standards-runout',
      label: 'Measured runout Fr is inside the allowable ISO tolerance',
      complete: standardsAcceptanceConfirmed,
      required: isSupportedFamily,
      note: isSupportedFamily
        ? 'The released standards gate compares only the ISO-style runout Fr reading against the allowable runout tolerance.'
        : undefined
    },
    {
      id: 'allowable-center-tolerance',
      label: 'Allowable center tolerance (TIR) resolved from reserve budget',
      complete: centerToleranceBudgetAvailable,
      required: isSupportedFamily,
      note: isSupportedFamily
        ? 'Requires explicit TIR-equivalent reserve entries for fit/location, workholding, measurement, process, and any additional allowance, each with traceable method notes.'
        : undefined
    },
    {
      id: 'center-tolerance-budget-confirmed',
      label: 'Reserve budget confirmed for release',
      complete: centerToleranceBudgetConfirmed,
      required: isSupportedFamily,
      note: isSupportedFamily
        ? 'Required after reviewing the reserve conversions and the final allowable center tolerance result.'
        : undefined
    },
    {
      id: 'damaged-tooth-review',
      label: 'Damaged-tooth review completed',
      complete: !isRackPinion || options.project.releaseChecklistState.damagedToothReviewComplete,
      required: isRackPinion,
      note: isRackPinion
        ? 'Confirm the selected datum is based on intact teeth or otherwise justified metrology.'
        : undefined
    },
    {
      id: 'independent-hand-check',
      label: 'Independent hand-check completed',
      complete: options.project.releaseChecklistState.independentHandCheckComplete,
      required: true,
      note:
        options.status === 'reviewReady'
          ? 'This is the final step before the result can be marked ready for machining review.'
          : 'Independent hand-check stays pending until the calculation result is review-ready.'
    }
  ];
}

function computeReleaseGateStatus(
  project: AnalysisProject,
  status: RecommendationStatus,
  checklist: ReleaseChecklistItem[]
): ReleaseGateStatus {
  if (status !== 'reviewReady') {
    return 'blocked';
  }

  const requiredIncomplete = checklist.filter((item) => item.required && !item.complete);
  if (requiredIncomplete.some((item) => item.id !== 'independent-hand-check')) {
    return 'blocked';
  }

  if (project.releaseChecklistState.independentHandCheckComplete) {
    return 'readyForMachiningReview';
  }

  return 'pendingIndependentCheck';
}

function solveGeometry(project: AnalysisProject, normalizedMeasurements: ReturnType<typeof normalizeMeasurementSet>) {
  if (!isSupportedGearFamily(project.gearFamily)) {
    return undefined;
  }

  if (project.gearFamily === 'spur') {
    return solveSpurGeometry({
      gearFamily: project.gearFamily,
      pathwayId: project.selectedPathwayId,
      measurements: normalizedMeasurements
    });
  }

  if (project.gearFamily === 'helical') {
    return solveHelicalGeometry({
      gearFamily: project.gearFamily,
      pathwayId: project.selectedPathwayId,
      measurements: normalizedMeasurements
    });
  }

  return solveRackPinionGeometry({
    gearFamily: project.gearFamily,
    pathwayId: project.selectedPathwayId,
    measurements: normalizedMeasurements
  });
}

export function analyzeProject(project: AnalysisProject): AnalysisResult {
  const standardsProfile = getStandardsProfile(project.standardsProfileId);
  const pathway = getPathway(project.selectedPathwayId);
  const normalizedMeasurements = normalizeMeasurementSet(project.measurements);
  const normalizationOutputs = normalizedMeasurementsToDerivedValues(normalizedMeasurements);
  const normalizationStep = createTraceStep({
    id: 'normalization',
    title: 'Normalize measurements',
    detail: 'Normalize user-entered measurements into canonical solver units exactly once before geometry or fit logic executes.',
    reference: `${standardsProfile.name} ${standardsProfile.version}`,
    equation: 'Lengths -> mm, angles -> deg, counts -> count, ratios -> ratio',
    equationId: 'INPUT-NORMALIZE-01',
    branchId: 'normalization',
    outputs: normalizationOutputs
  });

  const issues: ValidationIssue[] = [];
  validateEngineeringInputs(project, issues);
  const pathwayResolution =
    pathway.supportedFamilies.includes(project.gearFamily as never) && isSupportedGearFamily(project.gearFamily)
      ? resolvePathwayRequirements(
          project.selectedPathwayId,
          project.gearFamily,
          project.shaftInterface,
          normalizedMeasurements
        )
      : {
          pathwayId: project.selectedPathwayId,
          missingMeasurements: [],
          issues: []
        };

  issues.push(...pathwayResolution.issues);
  const missingMeasurements = [...pathwayResolution.missingMeasurements];

  if (!pathway.supportedFamilies.includes(project.gearFamily as never) || !isSupportedGearFamily(project.gearFamily)) {
    issues.push(unsupportedFamilyIssue(project.gearFamily));
  }

  const geometryResult = solveGeometry(project, normalizedMeasurements);

  if (geometryResult) {
    issues.push(...geometryResult.issues);
    missingMeasurements.push(...geometryResult.missingMeasurements);
  }

  const fitResult =
    geometryResult?.status === 'solved'
      ? solveFitRecommendation({
          project,
          geometryResult,
          measurements: normalizedMeasurements,
          standardsProfile
        })
      : {
          recommendation: undefined,
          derivedValues: [],
          traceSteps: [],
          issues: [],
          usedSuggestedNominal: false
        };

  const centeringResult =
    geometryResult?.status === 'solved'
      ? solveRackPinionCentering({
          project,
          geometryResult,
          measurements: normalizedMeasurements,
          standardsProfile
        })
      : {
          centeringResult: undefined,
          derivedValues: [],
          traceSteps: [],
          issues: []
        };

  issues.push(...fitResult.issues);
  issues.push(...centeringResult.issues);

  const dedupedIssues = dedupeIssues(issues);

  const status = computeStatus(
    dedupedIssues,
    Array.from(new Set(missingMeasurements)),
    fitResult.usedSuggestedNominal
  );

  const releaseChecklist = buildReleaseChecklist({
    project,
    normalizedMeasurements,
    status,
    usedSuggestedNominal: fitResult.usedSuggestedNominal,
    standardsAcceptancePass: centeringResult.centeringResult?.standardsAcceptancePass,
    setupEvidenceComplete: centeringResult.centeringResult?.setupEvidenceComplete,
    standardsBasisApproved: centeringResult.centeringResult?.standardsValidationStatus === 'approved',
    centerToleranceBudgetAvailable:
      centeringResult.centeringResult?.allowableCenterToleranceTirMm !== undefined,
    legacyRunoutMethodConfirmationRequired:
      centeringResult.centeringResult?.legacyRunoutMethodConfirmationRequired,
    standardsRunoutMethodConfirmed: centeringResult.centeringResult?.standardsRunoutMethodConfirmed
  });
  const releaseGateStatus = computeReleaseGateStatus(project, status, releaseChecklist);

  if (fitResult.recommendation) {
    fitResult.recommendation.status = status;
  }

  const derivedValues = [
    ...normalizationOutputs,
    ...(geometryResult?.derivedValues ?? []),
    ...fitResult.derivedValues,
    ...centeringResult.derivedValues
  ];

  const traceSteps = [
    normalizationStep,
    ...(geometryResult?.traceSteps ?? []),
    ...fitResult.traceSteps,
    ...centeringResult.traceSteps
  ];

  return {
    status,
    releaseGateStatus,
    pathwayId: project.selectedPathwayId,
    missingMeasurements: Array.from(new Set(missingMeasurements)),
    issues: dedupedIssues,
    normalizedMeasurements,
    geometryResult: geometryResult as GeometrySolveResult | undefined,
    derivedValues,
    recommendation: fitResult.recommendation,
    centeringResult: centeringResult.centeringResult,
    releaseChecklist,
    trace: {
      standardsProfileId: standardsProfile.id,
      generatedAt: new Date().toISOString(),
      steps: traceSteps
    },
    standardsProfile
  };
}
