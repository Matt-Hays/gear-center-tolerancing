import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeProject } from '@/lib/calculations/engine';
import { standardsProfiles, validateCenteringStandardsBasis } from '@/data/standardsProfiles';
import { benchmarkCases, cloneProject, getBenchmarkCase, positiveBenchmarkCases } from './benchmarks/cases';

function compareExpectationRecord(
  actualRecord: Record<string, unknown>,
  expectedRecord: Record<string, string | number>
) {
  for (const [key, expected] of Object.entries(expectedRecord)) {
    const actual = actualRecord[key];
    if (typeof expected === 'number') {
      expect(actual, `Expected numeric property ${key}`).toBeTypeOf('number');
      expect(actual as number).toBeCloseTo(expected, 6);
    } else {
      expect(actual).toBe(expected);
    }
  }
}

function recommendationProjection(record: Record<string, unknown>) {
  const projection: Record<string, string | number> = {};
  for (const key of [
    'status',
    'fitCode',
    'fitIntent',
    'nominalSizeMm',
    'recommendedBoreMinMm',
    'recommendedBoreMaxMm',
    'expectedInterfaceMinMm',
    'expectedInterfaceMaxMm',
    'holeBasis',
    'shaftBasis',
    'keyWidth',
    'keyHeight',
    'keywayHubDepth',
    'keywayWidthTolerance',
    'keywayDepthTolerance'
  ]) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      projection[key] = value;
    }
  }
  return projection;
}

function centeringProjection(record: Record<string, unknown>) {
  const projection: Record<string, string | number> = {};
  for (const key of [
    'headline',
    'referenceDiameterMm',
    'pitchDiameterMm',
    'outsideDiameterMm',
    'normalModuleMm',
    'allowableRunoutFrTUm',
    'reserveBudgetTotalTirMm',
    'allowableCenterToleranceTirMm',
    'standardsBasisId',
    'standardsValidationStatus',
    'iso1328FlankToleranceClass',
    'centerHeightFromRackPitchLineMm',
    'rackLinearPitchMm',
    'recordedRunoutFrMm',
    'recordedMountingFaceRunoutMm'
  ]) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      projection[key] = value;
    }
  }
  return projection;
}

function updateMeasurement(
  project: ReturnType<typeof cloneProject>,
  key: string,
  value: number,
  unit?: 'mm' | 'in' | 'deg' | 'count' | 'ratio'
) {
  project.measurements = project.measurements.map((record) =>
    record.key === key ? { ...record, value, ...(unit ? { unit } : {}) } : record
  );
}

function patchMeasurement(
  project: ReturnType<typeof cloneProject>,
  key: string,
  patch: Partial<(typeof project.measurements)[number]>
) {
  project.measurements = project.measurements.map((record) =>
    record.key === key ? { ...record, ...patch } : record
  );
}

function collectTaggedGroups(prefix: string) {
  const groups = new Map<string, typeof positiveBenchmarkCases>();

  for (const benchmark of positiveBenchmarkCases) {
    const tag = benchmark.tags.find((entry) => entry.startsWith(prefix));
    if (!tag) {
      continue;
    }

    const existing = groups.get(tag) ?? [];
    existing.push(benchmark);
    groups.set(tag, existing);
  }

  return Array.from(groups.entries());
}

describe('calculation benchmark suite', () => {
  it.each(benchmarkCases)('matches the hand-derived expectation for %s', (benchmark) => {
    expect(existsSync(resolve(benchmark.derivationPacket.path))).toBe(true);

    const result = analyzeProject(cloneProject(benchmark.project));

    expect(result.status).toBe(benchmark.expectation.status);
    expect(result.releaseGateStatus).toBe(benchmark.expectation.releaseGateStatus ?? result.releaseGateStatus);
    expect([...result.missingMeasurements].sort()).toEqual([...benchmark.expectation.missingMeasurements].sort());
    expect(Array.from(new Set(result.issues.map((issue) => issue.code))).sort()).toEqual(
      [...benchmark.expectation.issueCodes].sort()
    );

    if (benchmark.expectation.geometryKind) {
      expect(result.geometryResult?.geometry?.family).toBe(benchmark.expectation.geometryKind);
      if (benchmark.expectation.geometry) {
        compareExpectationRecord(
          result.geometryResult?.geometry as Record<string, unknown>,
          benchmark.expectation.geometry
        );
      }
    }

    if (benchmark.expectation.recommendation) {
      compareExpectationRecord(
        recommendationProjection(result.recommendation as unknown as Record<string, unknown>),
        benchmark.expectation.recommendation
      );
    } else {
      expect(result.recommendation).toBeUndefined();
    }

    if (benchmark.expectation.centering) {
      compareExpectationRecord(
        centeringProjection(result.centeringResult as unknown as Record<string, unknown>),
        benchmark.expectation.centering
      );
    } else {
      expect(result.centeringResult).toBeUndefined();
    }
  });

  it('keeps metric and imperial versions of the same supported benchmark in canonical parity', () => {
    for (const [tag, benchmarks] of collectTaggedGroups('unit-parity:')) {
      expect(benchmarks, `Expected a metric/imperial pair for ${tag}`).toHaveLength(2);

      const [left, right] = benchmarks
        .map((benchmark) => ({
          benchmark,
          result: analyzeProject(cloneProject(benchmark.project))
        }))
        .sort((a, b) => a.benchmark.project.unitSystem.localeCompare(b.benchmark.project.unitSystem));

      expect(left.result.status).toBe(right.result.status);
      expect(left.result.releaseGateStatus).toBe(right.result.releaseGateStatus);
      compareExpectationRecord(
        left.result.geometryResult?.geometry as Record<string, unknown>,
        right.result.geometryResult?.geometry as unknown as Record<string, string | number>
      );

      if (left.result.recommendation && right.result.recommendation) {
        compareExpectationRecord(
          recommendationProjection(left.result.recommendation as unknown as Record<string, unknown>),
          recommendationProjection(right.result.recommendation as unknown as Record<string, unknown>)
        );
      }

      if (left.result.centeringResult && right.result.centeringResult) {
        compareExpectationRecord(
          centeringProjection(left.result.centeringResult as unknown as Record<string, unknown>),
          centeringProjection(right.result.centeringResult as unknown as Record<string, unknown>)
        );
      }
    }
  });

  it('keeps replicate-from-od and direct-pitch solutions equivalent for the same supported part', () => {
    for (const [tag, benchmarks] of collectTaggedGroups('pathway-equivalence:')) {
      expect(benchmarks, `Expected a pathway pair for ${tag}`).toHaveLength(2);

      const [left, right] = benchmarks
        .map((benchmark) => ({
          benchmark,
          result: analyzeProject(cloneProject(benchmark.project))
        }))
        .sort((a, b) => a.benchmark.project.selectedPathwayId.localeCompare(b.benchmark.project.selectedPathwayId));

      compareExpectationRecord(
        left.result.geometryResult?.geometry as Record<string, unknown>,
        right.result.geometryResult?.geometry as unknown as Record<string, string | number>
      );
      if (left.result.centeringResult && right.result.centeringResult) {
        compareExpectationRecord(
          centeringProjection(left.result.centeringResult as unknown as Record<string, unknown>),
          centeringProjection(right.result.centeringResult as unknown as Record<string, unknown>)
        );
      }
    }
  });

  it('preserves rack and pinion invariants across the positive rack benchmark matrix', () => {
    const rackBenchmarks = positiveBenchmarkCases.filter((benchmark) => benchmark.project.gearFamily === 'rackPinion');

    for (const benchmark of rackBenchmarks) {
      const result = analyzeProject(cloneProject(benchmark.project));
      const geometry = result.geometryResult?.geometry;

      expect(geometry?.family).toBe('rackPinion');

      if (!geometry || geometry.family !== 'rackPinion') {
        continue;
      }

      expect(geometry.rackLinearPitchMm).toBeCloseTo(geometry.circularPitchMm, 6);
      expect(geometry.pinionPitchDiameterMm).toBeCloseTo(geometry.toothCount * geometry.transverseModuleMm, 6);
      expect(geometry.pinionOutsideDiameterMm).toBeCloseTo(
        geometry.pinionPitchDiameterMm + 2 * geometry.transverseModuleMm,
        6
      );
    }
  });

  it('emits trace metadata for every positive benchmark output', () => {
    for (const benchmark of positiveBenchmarkCases) {
      const result = analyzeProject(cloneProject(benchmark.project));

      expect(result.trace.steps.length).toBeGreaterThan(0);
      for (const step of result.trace.steps) {
        expect(step.equationId.length).toBeGreaterThan(0);
        expect(step.branchId.length).toBeGreaterThan(0);
        expect(step.outputs.length).toBeGreaterThan(0);
      }
    }
  });

  it('validates the shipped ISO profile metadata', () => {
    const issues = validateCenteringStandardsBasis(standardsProfiles[0]);
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(issues.map((issue) => issue.code)).toContain('centering-standards-basis-unapproved');
  });

  it('fails profile validation when ISO metadata is incomplete', () => {
    const brokenProfile = JSON.parse(JSON.stringify(standardsProfiles[0])) as (typeof standardsProfiles)[number];
    brokenProfile.centeringStandardsBases.iso1328Part1Runout.sourceReference = '';

    const profileIssues = validateCenteringStandardsBasis(brokenProfile);

    expect(profileIssues.map((issue) => issue.code)).toContain('incomplete-centering-standards-metadata');
  });

  it('blocks the result when the ISO flank tolerance class is missing', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    benchmark.iso1328FlankToleranceClass = undefined;

    const result = analyzeProject(benchmark);

    expect(result.status).toBe('blocked');
    expect(result.issues.map((issue) => issue.code)).toContain('missing-iso1328-flank-class');
    expect(result.centeringResult).toBeUndefined();
  });

  it('blocks unsupported ISO flank tolerance classes explicitly', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    benchmark.iso1328FlankToleranceClass = 12 as never;

    const result = analyzeProject(benchmark);

    expect(result.status).toBe('blocked');
    expect(result.issues.map((issue) => issue.code)).toContain('unsupported-iso1328-flank-class');
    expect(result.centeringResult).toBeUndefined();
  });

  it('blocks the result when measured runout exceeds the allowable ISO tolerance', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'runoutFrMeasured', 0.08, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.status).toBe('blocked');
    expect(result.issues.map((issue) => issue.code)).toContain('standards-runout-acceptance-failed');
    expect(result.centeringResult?.standardsAcceptancePass).toBe(false);
  });

  it('does not use mounting-face runout as the normative ISO acceptance quantity', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'mountingFaceRunout', 0.4, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.standardsAcceptancePass).toBe(true);
    expect(result.issues.map((issue) => issue.code)).not.toContain('standards-runout-acceptance-failed');
  });

  it('does not auto-deduct mounting-face runout from the allowable center tolerance budget', () => {
    const baseline = analyzeProject(cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project));
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'mountingFaceRunout', 0.4, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeCloseTo(
      baseline.centeringResult?.allowableCenterToleranceTirMm ?? 0,
      6
    );
  });

  it('does not auto-deduct fit recommendation outputs from the allowable center tolerance budget', () => {
    const baseline = analyzeProject(cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project));
    const benchmark = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    updateMeasurement(benchmark, 'boreDiameterMeasured', 20, 'mm');
    updateMeasurement(benchmark, 'shaftDiameterMeasured', 20.2, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeCloseTo(
      baseline.centeringResult?.allowableCenterToleranceTirMm ?? 0,
      6
    );
  });

  it('blocks negative, NaN, and infinite runout inputs', () => {
    const negative = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(negative, 'runoutFrMeasured', -0.01, 'mm');
    let result = analyzeProject(negative);
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-runout-fr-input');

    const nanCase = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(nanCase, 'mountingFaceRunout', Number.NaN, 'mm');
    result = analyzeProject(nanCase);
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-mounting-face-runout-input');

    const infiniteCase = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(infiniteCase, 'runoutFrMeasured', Number.POSITIVE_INFINITY, 'mm');
    result = analyzeProject(infiniteCase);
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-runout-fr-input');
  });

  it('resolves allowable center tolerance separately from the standards FrT quantity', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.appliedCenteringLimitStatus).toBe('approved');
    expect(result.centeringResult?.allowableRunoutFrTMm).toBeCloseTo(0.048, 6);
    expect(result.centeringResult?.reserveBudgetTotalTirMm).toBeCloseTo(0.018, 6);
    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeCloseTo(0.03, 6);
    expect(result.centeringResult?.allowableCenterToleranceTirMm).not.toBe(result.centeringResult?.allowableRunoutFrTMm);
    expect(result.centeringResult?.equivalentRadialOffsetMm).toBeCloseTo(0.015, 6);
  });

  it('blocks the final center tolerance when a reserve line is missing', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    patchMeasurement(benchmark, 'fitLocationTirReserve', { value: undefined });

    const result = analyzeProject(benchmark);

    expect(result.missingMeasurements).toContain('fitLocationTirReserve');
    expect(result.issues.map((issue) => issue.code)).toContain('missing-center-tolerance-reserve');
    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeUndefined();
  });

  it('blocks negative reserve inputs explicitly', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'processTirReserve', -0.001, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.issues.map((issue) => issue.code)).toContain('invalid-center-tolerance-reserve');
    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeUndefined();
  });

  it('requires reserve method notes before publishing the final center tolerance', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    patchMeasurement(benchmark, 'measurementTirReserve', {
      method: '',
      notes: ''
    });

    const result = analyzeProject(benchmark);

    expect(result.issues.map((issue) => issue.code)).toContain('center-tolerance-reserve-method-required');
    expect(result.issues.map((issue) => issue.code)).toContain('center-tolerance-reserve-notes-required');
    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBeUndefined();
  });

  it('reports zero allowable center tolerance when the reserve budget exactly consumes FrT', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'fitLocationTirReserve', 0.02, 'mm');
    updateMeasurement(benchmark, 'workholdingTirReserve', 0.01, 'mm');
    updateMeasurement(benchmark, 'measurementTirReserve', 0.005, 'mm');
    updateMeasurement(benchmark, 'processTirReserve', 0.01, 'mm');
    updateMeasurement(benchmark, 'additionalTirReserve', 0.003, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBe(0);
    expect(result.issues.map((issue) => issue.code)).toContain('allowable-center-tolerance-exhausted');
  });

  it('reports zero allowable center tolerance when the reserve budget over-consumes FrT', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-metric').project);
    updateMeasurement(benchmark, 'fitLocationTirReserve', 0.025, 'mm');
    updateMeasurement(benchmark, 'workholdingTirReserve', 0.015, 'mm');
    updateMeasurement(benchmark, 'measurementTirReserve', 0.005, 'mm');
    updateMeasurement(benchmark, 'processTirReserve', 0.012, 'mm');
    updateMeasurement(benchmark, 'additionalTirReserve', 0.004, 'mm');

    const result = analyzeProject(benchmark);

    expect(result.centeringResult?.allowableCenterToleranceTirMm).toBe(0);
    expect(result.issues.map((issue) => issue.code)).toContain('allowable-center-tolerance-exhausted');
  });

  it('tightens or loosens monotonically across ISO classes for a fixed gear', () => {
    const benchmark = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    const tolerances: number[] = [];

    for (const isoClass of standardsProfiles[0].centeringStandardsBases.iso1328Part1Runout.classNumbers) {
      benchmark.iso1328FlankToleranceClass = isoClass;
      const result = analyzeProject(cloneProject(benchmark));
      tolerances.push(result.centeringResult?.allowableRunoutFrTUm ?? 0);
    }

    for (let index = 1; index < tolerances.length; index += 1) {
      expect(tolerances[index]).toBeGreaterThan(tolerances[index - 1]);
    }
  });

  it('blocks out-of-scope ISO reference diameters, modules, tooth counts, and helix angles', () => {
    const oversize = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    updateMeasurement(oversize, 'moduleMetric', 800, 'mm');
    let result = analyzeProject(oversize);
    expect(result.issues.map((issue) => issue.code)).toContain('iso1328-reference-diameter-out-of-scope');

    const undersizeModule = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    updateMeasurement(undersizeModule, 'moduleMetric', 0.1, 'mm');
    result = analyzeProject(undersizeModule);
    expect(result.issues.map((issue) => issue.code)).toContain('iso1328-normal-module-out-of-scope');

    const lowToothCount = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    updateMeasurement(lowToothCount, 'toothCount', 4, 'count');
    result = analyzeProject(lowToothCount);
    expect(result.issues.map((issue) => issue.code)).toContain('iso1328-tooth-count-out-of-scope');

    const highHelix = cloneProject(getBenchmarkCase('helical-direct-pitch-keyed-metric').project);
    updateMeasurement(highHelix, 'helixAngleDeg', 50, 'deg');
    result = analyzeProject(highHelix);
    expect(result.issues.map((issue) => issue.code)).toContain('iso1328-helix-angle-out-of-scope');
  });

  it('warns when a migrated legacy runout reading has not been confirmed as ISO-equivalent', () => {
    const benchmark = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    benchmark.legacyCenteringAudit = {
      legacyAgmaQQualityNumber: 10,
      migratedRunoutFrFromToothDatum: true
    };
    benchmark.releaseChecklistState.standardsRunoutMethodConfirmed = false;

    const result = analyzeProject(benchmark);

    expect(result.issues.map((issue) => issue.code)).toContain('measurement-method-confirmation-required');
    expect(result.releaseGateStatus).toBe('blocked');
  });

  it('keeps release blocked while the centering standards basis is provisional', () => {
    const benchmark = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    const result = analyzeProject(benchmark);

    expect(result.status).toBe('draft');
    expect(result.releaseGateStatus).toBe('blocked');
    expect(result.centeringResult?.standardsValidationStatus).toBe('provisional');
    expect(result.centeringResult?.releaseBlockReasons).toContain(
      'The selected standards basis remains provisional and is not approved for release use.'
    );
  });

  it('blocks non-integer tooth counts even though decimal typing is allowed in the UI', () => {
    const benchmark = cloneProject(getBenchmarkCase('spur-direct-pitch-keyed-metric').project);
    updateMeasurement(benchmark, 'toothCount', 32.5, 'count');

    const result = analyzeProject(benchmark);

    expect(result.status).toBe('blocked');
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-tooth-count');
  });
});
