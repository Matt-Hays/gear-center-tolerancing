import { getMeasurementDefinition } from '@/data/measurementCatalog';
import type {
  AnalysisProject,
  BenchmarkCase,
  Iso1328FlankToleranceClass,
  MeasurementKey,
  MeasurementRecord,
  PathwayId,
  ReleaseChecklistState,
  ShaftInterface,
  SupportedGearFamily,
  UnitSystem
} from '@/types/domain';

const FIXTURE_TIMESTAMP = '2026-04-05T16:00:00.000Z';

type MeasurementInput =
  | { key: MeasurementKey; kind: 'length'; mm: number; unitSystem: UnitSystem; forceUnit?: 'mm' | 'in' }
  | { key: MeasurementKey; kind: 'angle' | 'count' | 'ratio'; value: number };

interface BaseFixture {
  family: SupportedGearFamily;
  toothCount: number;
  faceWidthMm: number;
  pressureAngleDeg: number;
  outsideDiameterMm: number;
  pitchDiameterMm: number;
  moduleMm: number;
  diametralPitch: number;
  nominalShaftSizeMm: number;
  circularPitchMm: number;
  runoutFrMeasuredMm: number;
  mountingFaceRunoutMm: number;
  isoClass: Iso1328FlankToleranceClass;
  allowableRunoutFrTUm: number;
  allowableCenterToleranceTirMm: number;
}

interface SpurFixture extends BaseFixture {
  family: 'spur';
}

interface HelicalFixture extends BaseFixture {
  family: 'helical';
  helixAngleDeg: number;
  normalModuleMm: number;
  normalCircularPitchMm: number;
  leadMm: number;
}

interface RackFixture extends BaseFixture {
  family: 'rackPinion';
  rackLinearPitchMm: number;
}

const spurFixture: SpurFixture = {
  family: 'spur',
  toothCount: 32,
  faceWidthMm: 22.225,
  pressureAngleDeg: 20,
  outsideDiameterMm: 86.36,
  pitchDiameterMm: 81.28,
  moduleMm: 2.54,
  diametralPitch: 10,
  nominalShaftSizeMm: 25.4,
  circularPitchMm: 7.979645340118075,
  runoutFrMeasuredMm: 0.02,
  mountingFaceRunoutMm: 0.01,
  isoClass: 8,
  allowableRunoutFrTUm: 48,
  allowableCenterToleranceTirMm: 0.03
};

const helicalFixture: HelicalFixture = {
  family: 'helical',
  toothCount: 24,
  faceWidthMm: 25.4,
  pressureAngleDeg: 20,
  outsideDiameterMm: 65.86690319754847,
  pitchDiameterMm: 60.96,
  moduleMm: 2.54,
  diametralPitch: 10,
  nominalShaftSizeMm: 31.75,
  circularPitchMm: 7.979645340118075,
  runoutFrMeasuredMm: 0.018,
  mountingFaceRunoutMm: 0.012,
  isoClass: 8,
  helixAngleDeg: 15,
  normalModuleMm: 2.4534515987742336,
  normalCircularPitchMm: 7.707745518647265,
  leadMm: 714.7306040568213,
  allowableRunoutFrTUm: 46,
  allowableCenterToleranceTirMm: 0.028
};

const rackFixture: RackFixture = {
  family: 'rackPinion',
  toothCount: 20,
  faceWidthMm: 31.75,
  pressureAngleDeg: 20,
  outsideDiameterMm: 69.85,
  pitchDiameterMm: 63.5,
  moduleMm: 3.175,
  diametralPitch: 8,
  nominalShaftSizeMm: 38.1,
  circularPitchMm: 9.974556675147593,
  rackLinearPitchMm: 9.974556675147593,
  runoutFrMeasuredMm: 0.0254,
  mountingFaceRunoutMm: 0.0127,
  isoClass: 8,
  allowableRunoutFrTUm: 48,
  allowableCenterToleranceTirMm: 0.03
};

const reserveBudgetMeasurements = {
  fitLocationTirReserve: 0.004,
  workholdingTirReserve: 0.003,
  measurementTirReserve: 0.002,
  processTirReserve: 0.006,
  additionalTirReserve: 0.003
} as const;

const reserveBudgetNotes = {
  fitLocationTirReserve: 'Converted fit and location contributors to TIR at the centering datum.',
  workholdingTirReserve: 'Converted workholding repeatability to TIR at the centering datum.',
  measurementTirReserve: 'Converted measurement transfer effects to a TIR-equivalent reserve.',
  processTirReserve: 'Converted machining process variation to a TIR-equivalent reserve.',
  additionalTirReserve: 'Reserved explicit additional legacy-part recreation allowance in TIR.'
} as const;

const reserveBudgetTotalMm = Object.values(reserveBudgetMeasurements).reduce((sum, value) => sum + value, 0);

const keyedInterfaceMeasurements = {
  spur: {
    boreDiameterMeasuredMm: 25.4127,
    shaftDiameterMeasuredMm: 25.39746,
    existingKeyWidthMm: 6.35,
    existingKeyDepthHubMm: 3.175
  },
  helical: {
    boreDiameterMeasuredMm: 31.7684,
    shaftDiameterMeasuredMm: 31.75062,
    existingKeyWidthMm: 6.35,
    existingKeyDepthHubMm: 3.175
  },
  rackPinion: {
    boreDiameterMeasuredMm: 38.1127,
    shaftDiameterMeasuredMm: 38.1,
    existingKeyWidthMm: 9.525,
    existingKeyDepthHubMm: 4.7752
  }
} as const;

const interferenceInterfaceMeasurements = {
  spur: {
    boreDiameterMeasuredMm: 25.405,
    shaftDiameterMeasuredMm: 25.426
  },
  helical: {
    boreDiameterMeasuredMm: 31.76,
    shaftDiameterMeasuredMm: 31.805
  },
  rackPinion: {
    boreDiameterMeasuredMm: 38.105,
    shaftDiameterMeasuredMm: 38.145
  }
} as const;

const keyedRecommendations = {
  spur: {
    fitCode: 'H7/h6',
    nominalSizeMm: 25.4,
    recommendedBoreMinMm: 25.4,
    recommendedBoreMaxMm: 25.421,
    expectedInterfaceMinMm: 0,
    expectedInterfaceMaxMm: 0.034,
    holeBasis: 'H7',
    shaftBasis: 'h6',
    keyWidth: 6.35,
    keyHeight: 6.35,
    keywayHubDepth: 3.175
  },
  helical: {
    fitCode: 'H7/h6',
    nominalSizeMm: 31.75,
    recommendedBoreMinMm: 31.75,
    recommendedBoreMaxMm: 31.775,
    expectedInterfaceMinMm: 0,
    expectedInterfaceMaxMm: 0.041,
    holeBasis: 'H7',
    shaftBasis: 'h6',
    keyWidth: 6.35,
    keyHeight: 6.35,
    keywayHubDepth: 3.175
  },
  rackPinion: {
    fitCode: 'H7/h6',
    nominalSizeMm: 38.1,
    recommendedBoreMinMm: 38.1,
    recommendedBoreMaxMm: 38.125,
    expectedInterfaceMinMm: 0,
    expectedInterfaceMaxMm: 0.041,
    holeBasis: 'H7',
    shaftBasis: 'h6',
    keyWidth: 9.525,
    keyHeight: 9.525,
    keywayHubDepth: 4.7752
  }
} as const;

const interferenceRecommendations = {
  spur: {
    fitCode: 'H7/s6',
    nominalSizeMm: 25.4,
    recommendedBoreMinMm: 25.4,
    recommendedBoreMaxMm: 25.421,
    expectedInterfaceMinMm: 0.01,
    expectedInterfaceMaxMm: 0.044,
    holeBasis: 'H7',
    shaftBasis: 's6'
  },
  helical: {
    fitCode: 'H7/s6',
    nominalSizeMm: 31.75,
    recommendedBoreMinMm: 31.75,
    recommendedBoreMaxMm: 31.775,
    expectedInterfaceMinMm: 0.013,
    expectedInterfaceMaxMm: 0.054,
    holeBasis: 'H7',
    shaftBasis: 's6'
  },
  rackPinion: {
    fitCode: 'H7/s6',
    nominalSizeMm: 38.1,
    recommendedBoreMinMm: 38.1,
    recommendedBoreMaxMm: 38.125,
    expectedInterfaceMinMm: 0.013,
    expectedInterfaceMaxMm: 0.054,
    holeBasis: 'H7',
    shaftBasis: 's6'
  }
} as const;

function toInputLength(mm: number, unit: 'mm' | 'in') {
  return unit === 'mm' ? mm : mm / 25.4;
}

function createMeasurement(input: MeasurementInput): MeasurementRecord {
  const definition = getMeasurementDefinition(input.key);
  if (!definition) {
    throw new Error(`Unknown measurement definition for ${input.key}`);
  }

  const reserveNote =
    input.key in reserveBudgetNotes
      ? reserveBudgetNotes[input.key as keyof typeof reserveBudgetNotes]
      : '';
  const method =
    input.key in reserveBudgetNotes
      ? 'Hand-reviewed reserve conversion worksheet'
      : 'Hand-derived benchmark fixture';
  const instrument =
    input.key in reserveBudgetNotes
      ? 'Reviewed engineering worksheet'
      : 'Reviewed benchmark dataset';

  if (input.kind === 'length') {
    const unit = input.forceUnit ?? (input.unitSystem === 'metric' ? 'mm' : 'in');

    return {
      key: input.key,
      label: definition.label,
      unit,
      value: toInputLength(input.mm, unit),
      method,
      instrument,
      notes: reserveNote
    };
  }

  return {
    key: input.key,
    label: definition.label,
    unit: definition.unit,
    value: input.value,
    method,
    instrument,
    notes: reserveNote
  };
}

function createProject(options: {
  id: string;
  title: string;
  gearFamily: SupportedGearFamily | 'bevel';
  shaftInterface: ShaftInterface;
  unitSystem: UnitSystem;
  pathwayId: PathwayId;
  isoClass?: Iso1328FlankToleranceClass;
  measurements: MeasurementInput[];
  notes?: string;
  legacyCenteringAudit?: AnalysisProject['legacyCenteringAudit'];
  releaseChecklistState?: ReleaseChecklistState;
}): AnalysisProject {
  return {
    id: options.id,
    name: options.title,
    analyst: 'Benchmark Engineer',
    customer: 'Validation Suite',
    partNumber: options.id.toUpperCase(),
    notes: options.notes ?? 'Repo-owned benchmark fixture with hand-derived expectations.',
    gearFamily: options.gearFamily,
    shaftInterface: options.shaftInterface,
    unitSystem: options.unitSystem,
    dutyClass: 'normal',
    centerToleranceStandard: 'iso1328Part1Runout',
    iso1328FlankToleranceClass: options.isoClass,
    standardsProfileId: 'ansi-agma-hybrid-v1',
    selectedPathwayId: options.pathwayId,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    legacyCenteringAudit: options.legacyCenteringAudit,
    releaseChecklistState: options.releaseChecklistState ?? {
      standardsBasisConfirmed: true,
      standardsRunoutMethodConfirmed: true,
      damagedToothReviewComplete: true,
      legacyRunoutMethodConfirmed: true,
      centerToleranceBudgetConfirmed: true,
      independentHandCheckComplete: true
    },
    measurements: options.measurements.map((measurement) => createMeasurement(measurement))
  };
}

function positiveTags(
  family: SupportedGearFamily,
  pathwayId: PathwayId,
  shaftInterface: ShaftInterface,
  unitSystem: UnitSystem
) {
  return [
    'positive',
    `family:${family}`,
    `pathway:${pathwayId}`,
    `interface:${shaftInterface}`,
    `unit:${unitSystem}`,
    `unit-parity:${family}:${pathwayId}:${shaftInterface}`,
    ...(pathwayId === 'rack-centering' ? [] : [`pathway-equivalence:${family}:${shaftInterface}:${unitSystem}`])
  ];
}

function baseMeasurements(
  fixture: BaseFixture,
  unitSystem: UnitSystem,
  shaftInterface: ShaftInterface,
  pathwayId: PathwayId
): MeasurementInput[] {
  const interfaceMeasurements =
    shaftInterface === 'keyed'
      ? keyedInterfaceMeasurements[fixture.family]
      : interferenceInterfaceMeasurements[fixture.family];

  const directPitchInputs: MeasurementInput[] =
    unitSystem === 'metric'
      ? [{ key: 'moduleMetric', kind: 'length', mm: fixture.moduleMm, unitSystem, forceUnit: 'mm' }]
      : [{ key: 'diametralPitch', kind: 'ratio', value: fixture.diametralPitch }];

  const crossChecks: MeasurementInput[] =
    unitSystem === 'metric'
      ? [
          { key: 'moduleMetric', kind: 'length', mm: fixture.moduleMm, unitSystem, forceUnit: 'mm' },
          { key: 'pitchDiameterKnown', kind: 'length', mm: fixture.pitchDiameterMm, unitSystem }
        ]
      : [
          { key: 'diametralPitch', kind: 'ratio', value: fixture.diametralPitch },
          { key: 'pitchDiameterKnown', kind: 'length', mm: fixture.pitchDiameterMm, unitSystem }
        ];

  const common: MeasurementInput[] = [
    { key: 'toothCount', kind: 'count', value: fixture.toothCount },
    { key: 'faceWidth', kind: 'length', mm: fixture.faceWidthMm, unitSystem },
    { key: 'runoutFrMeasured', kind: 'length', mm: fixture.runoutFrMeasuredMm, unitSystem },
    { key: 'mountingFaceRunout', kind: 'length', mm: fixture.mountingFaceRunoutMm, unitSystem },
    { key: 'fitLocationTirReserve', kind: 'length', mm: reserveBudgetMeasurements.fitLocationTirReserve, unitSystem },
    { key: 'workholdingTirReserve', kind: 'length', mm: reserveBudgetMeasurements.workholdingTirReserve, unitSystem },
    { key: 'measurementTirReserve', kind: 'length', mm: reserveBudgetMeasurements.measurementTirReserve, unitSystem },
    { key: 'processTirReserve', kind: 'length', mm: reserveBudgetMeasurements.processTirReserve, unitSystem },
    { key: 'additionalTirReserve', kind: 'length', mm: reserveBudgetMeasurements.additionalTirReserve, unitSystem },
    { key: 'boreDiameterMeasured', kind: 'length', mm: interfaceMeasurements.boreDiameterMeasuredMm, unitSystem },
    { key: 'shaftDiameterMeasured', kind: 'length', mm: interfaceMeasurements.shaftDiameterMeasuredMm, unitSystem },
    { key: 'nominalShaftSize', kind: 'length', mm: fixture.nominalShaftSizeMm, unitSystem },
    { key: 'pressureAngleDeg', kind: 'angle', value: fixture.pressureAngleDeg }
  ];

  if (fixture.family === 'helical') {
    common.push({ key: 'helixAngleDeg', kind: 'angle', value: fixture.helixAngleDeg });
  }

  if (pathwayId === 'replicate-from-od' || pathwayId === 'rack-centering') {
    common.push({ key: 'outsideDiameter', kind: 'length', mm: fixture.outsideDiameterMm, unitSystem });
  }

  if (pathwayId === 'direct-pitch') {
    common.push(...directPitchInputs);
    common.push({ key: 'outsideDiameter', kind: 'length', mm: fixture.outsideDiameterMm, unitSystem });
    common.push({ key: 'pitchDiameterKnown', kind: 'length', mm: fixture.pitchDiameterMm, unitSystem });
  } else {
    common.push(...crossChecks);
  }

  if (fixture.family === 'rackPinion') {
    common.push({ key: 'rackLinearPitch', kind: 'length', mm: rackFixture.rackLinearPitchMm, unitSystem });
  }

  if (shaftInterface === 'keyed') {
    const keyed = keyedInterfaceMeasurements[fixture.family];
    common.push(
      { key: 'existingKeyWidth', kind: 'length', mm: keyed.existingKeyWidthMm, unitSystem },
      { key: 'existingKeyDepthHub', kind: 'length', mm: keyed.existingKeyDepthHubMm, unitSystem }
    );
  }

  return common;
}

function buildCenteredExpectation(fixture: BaseFixture, normalModuleMm: number, includeRackData = false) {
  const expectation: Record<string, string | number> = {
    headline: 'Center before broach',
    standardsBasisId: 'iso1328Part1Runout',
    standardsValidationStatus: 'provisional',
    referenceDiameterMm: fixture.pitchDiameterMm,
    pitchDiameterMm: fixture.pitchDiameterMm,
    outsideDiameterMm: fixture.outsideDiameterMm,
    normalModuleMm,
    allowableRunoutFrTUm: fixture.allowableRunoutFrTUm,
    reserveBudgetTotalTirMm: reserveBudgetTotalMm,
    allowableCenterToleranceTirMm: fixture.allowableCenterToleranceTirMm,
    iso1328FlankToleranceClass: fixture.isoClass,
    recordedRunoutFrMm: fixture.runoutFrMeasuredMm,
    recordedMountingFaceRunoutMm: fixture.mountingFaceRunoutMm
  };

  if (includeRackData && fixture.family === 'rackPinion') {
    expectation.centerHeightFromRackPitchLineMm = fixture.pitchDiameterMm / 2;
    expectation.rackLinearPitchMm = rackFixture.rackLinearPitchMm;
  }

  return expectation;
}

function buildSpurCase(pathwayId: PathwayId, shaftInterface: ShaftInterface, unitSystem: UnitSystem): BenchmarkCase {
  return {
    id: `spur-${pathwayId}-${shaftInterface}-${unitSystem}`,
    title: `Spur ${pathwayId} ${shaftInterface} ${unitSystem}`,
    tags: positiveTags('spur', pathwayId, shaftInterface, unitSystem),
    derivationPacket: {
      id: `spur-${pathwayId}`,
      title: `Spur ${pathwayId} derivation`,
      path: `tests/benchmarks/derivations/spur-${pathwayId}.md`
    },
    project: createProject({
      id: `spur-${pathwayId}-${shaftInterface}-${unitSystem}`,
      title: `Spur ${pathwayId} ${shaftInterface} ${unitSystem}`,
      gearFamily: 'spur',
      shaftInterface,
      unitSystem,
      pathwayId,
      isoClass: spurFixture.isoClass,
      measurements: baseMeasurements(spurFixture, unitSystem, shaftInterface, pathwayId)
    }),
    expectation: {
      status: 'draft',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: ['centering-standards-basis-unapproved'],
      geometryKind: 'spur',
      geometry: {
        toothCount: spurFixture.toothCount,
        transverseModuleMm: spurFixture.moduleMm,
        transverseDiametralPitch: spurFixture.diametralPitch,
        pitchDiameterMm: spurFixture.pitchDiameterMm,
        outsideDiameterMm: spurFixture.outsideDiameterMm,
        circularPitchMm: spurFixture.circularPitchMm,
        pressureAngleDeg: spurFixture.pressureAngleDeg
      },
      centering: buildCenteredExpectation(spurFixture, spurFixture.moduleMm),
      recommendation:
        shaftInterface === 'keyed' ? { ...keyedRecommendations.spur } : { ...interferenceRecommendations.spur }
    }
  };
}

function buildHelicalCase(pathwayId: PathwayId, shaftInterface: ShaftInterface, unitSystem: UnitSystem): BenchmarkCase {
  return {
    id: `helical-${pathwayId}-${shaftInterface}-${unitSystem}`,
    title: `Helical ${pathwayId} ${shaftInterface} ${unitSystem}`,
    tags: positiveTags('helical', pathwayId, shaftInterface, unitSystem),
    derivationPacket: {
      id: `helical-${pathwayId}`,
      title: `Helical ${pathwayId} derivation`,
      path: `tests/benchmarks/derivations/helical-${pathwayId}.md`
    },
    project: createProject({
      id: `helical-${pathwayId}-${shaftInterface}-${unitSystem}`,
      title: `Helical ${pathwayId} ${shaftInterface} ${unitSystem}`,
      gearFamily: 'helical',
      shaftInterface,
      unitSystem,
      pathwayId,
      isoClass: helicalFixture.isoClass,
      measurements: baseMeasurements(helicalFixture, unitSystem, shaftInterface, pathwayId)
    }),
    expectation: {
      status: 'draft',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: ['centering-standards-basis-unapproved'],
      geometryKind: 'helical',
      geometry: {
        toothCount: helicalFixture.toothCount,
        helixAngleDeg: helicalFixture.helixAngleDeg,
        transverseModuleMm: helicalFixture.moduleMm,
        normalModuleMm: helicalFixture.normalModuleMm,
        transverseDiametralPitch: helicalFixture.diametralPitch,
        pitchDiameterMm: helicalFixture.pitchDiameterMm,
        outsideDiameterMm: helicalFixture.outsideDiameterMm,
        transverseCircularPitchMm: helicalFixture.circularPitchMm,
        normalCircularPitchMm: helicalFixture.normalCircularPitchMm,
        leadMm: helicalFixture.leadMm,
        pressureAngleDeg: helicalFixture.pressureAngleDeg
      },
      centering: buildCenteredExpectation(helicalFixture, helicalFixture.normalModuleMm),
      recommendation:
        shaftInterface === 'keyed' ? { ...keyedRecommendations.helical } : { ...interferenceRecommendations.helical }
    }
  };
}

function buildRackCase(pathwayId: PathwayId, shaftInterface: ShaftInterface, unitSystem: UnitSystem): BenchmarkCase {
  return {
    id: `rack-pinion-${pathwayId}-${shaftInterface}-${unitSystem}`,
    title: `Rack pinion ${pathwayId} ${shaftInterface} ${unitSystem}`,
    tags: positiveTags('rackPinion', pathwayId, shaftInterface, unitSystem),
    derivationPacket: {
      id: `rack-pinion-${pathwayId}`,
      title: `Rack pinion ${pathwayId} derivation`,
      path:
        pathwayId === 'rack-centering'
          ? 'tests/benchmarks/derivations/rack-pinion-rack-centering.md'
          : `tests/benchmarks/derivations/rack-pinion-${pathwayId}.md`
    },
    project: createProject({
      id: `rack-pinion-${pathwayId}-${shaftInterface}-${unitSystem}`,
      title: `Rack pinion ${pathwayId} ${shaftInterface} ${unitSystem}`,
      gearFamily: 'rackPinion',
      shaftInterface,
      unitSystem,
      pathwayId,
      isoClass: rackFixture.isoClass,
      measurements: baseMeasurements(rackFixture, unitSystem, shaftInterface, pathwayId)
    }),
    expectation: {
      status: 'draft',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: ['centering-standards-basis-unapproved'],
      geometryKind: 'rackPinion',
      geometry: {
        toothCount: rackFixture.toothCount,
        transverseModuleMm: rackFixture.moduleMm,
        transverseDiametralPitch: rackFixture.diametralPitch,
        pinionPitchDiameterMm: rackFixture.pitchDiameterMm,
        pinionOutsideDiameterMm: rackFixture.outsideDiameterMm,
        circularPitchMm: rackFixture.circularPitchMm,
        rackLinearPitchMm: rackFixture.rackLinearPitchMm
      },
      centering: buildCenteredExpectation(rackFixture, rackFixture.moduleMm, true),
      recommendation:
        shaftInterface === 'keyed'
          ? { ...keyedRecommendations.rackPinion }
          : { ...interferenceRecommendations.rackPinion }
    }
  };
}

function buildMissingNominalCase(): BenchmarkCase {
  return {
    id: 'spur-direct-keyed-imperial-missing-nominal',
    title: 'Spur direct keyed imperial missing nominal size',
    tags: ['negative', 'missing-required', 'pathway:direct-pitch', 'family:spur', 'interface:keyed', 'unit:imperial'],
    derivationPacket: {
      id: 'spur-direct-missing-nominal',
      title: 'Spur direct missing nominal derivation',
      path: 'tests/benchmarks/derivations/spur-direct-missing-nominal.md'
    },
    project: createProject({
      id: 'spur-direct-keyed-imperial-missing-nominal',
      title: 'Spur direct keyed imperial missing nominal size',
      gearFamily: 'spur',
      shaftInterface: 'keyed',
      unitSystem: 'imperial',
      pathwayId: 'direct-pitch',
      isoClass: spurFixture.isoClass,
      measurements: baseMeasurements(spurFixture, 'imperial', 'keyed', 'direct-pitch').filter(
        (measurement) => measurement.key !== 'nominalShaftSize'
      )
    }),
    expectation: {
      status: 'blocked',
      releaseGateStatus: 'blocked',
      missingMeasurements: ['nominalShaftSize'],
      issueCodes: ['centering-standards-basis-unapproved', 'nominal-size-suggested'],
      geometryKind: 'spur',
      centering: buildCenteredExpectation(spurFixture, spurFixture.moduleMm),
      recommendation: {
        fitCode: 'H7/h6',
        nominalSizeMm: 25.4,
        recommendedBoreMinMm: 25.4,
        recommendedBoreMaxMm: 25.421,
        keyWidth: 6.35,
        keywayHubDepth: 3.175
      }
    }
  };
}

function buildCrossCheckMismatchCase(): BenchmarkCase {
  return {
    id: 'spur-direct-keyed-metric-crosscheck-mismatch',
    title: 'Spur direct keyed metric cross-check mismatch',
    tags: ['negative', 'cross-check', 'pathway:direct-pitch', 'family:spur', 'interface:keyed', 'unit:metric'],
    derivationPacket: {
      id: 'spur-direct-crosscheck-mismatch',
      title: 'Spur direct cross-check mismatch derivation',
      path: 'tests/benchmarks/derivations/spur-direct-crosscheck-mismatch.md'
    },
    project: createProject({
      id: 'spur-direct-keyed-metric-crosscheck-mismatch',
      title: 'Spur direct keyed metric cross-check mismatch',
      gearFamily: 'spur',
      shaftInterface: 'keyed',
      unitSystem: 'metric',
      pathwayId: 'direct-pitch',
      isoClass: spurFixture.isoClass,
      measurements: [
        { key: 'toothCount', kind: 'count', value: spurFixture.toothCount },
        { key: 'moduleMetric', kind: 'length', mm: spurFixture.moduleMm, unitSystem: 'metric', forceUnit: 'mm' },
        { key: 'diametralPitch', kind: 'ratio', value: 9.5 },
        { key: 'outsideDiameter', kind: 'length', mm: 90, unitSystem: 'metric' },
        { key: 'pitchDiameterKnown', kind: 'length', mm: 85, unitSystem: 'metric' },
        { key: 'faceWidth', kind: 'length', mm: spurFixture.faceWidthMm, unitSystem: 'metric' },
        { key: 'runoutFrMeasured', kind: 'length', mm: spurFixture.runoutFrMeasuredMm, unitSystem: 'metric' },
        { key: 'mountingFaceRunout', kind: 'length', mm: spurFixture.mountingFaceRunoutMm, unitSystem: 'metric' },
        { key: 'fitLocationTirReserve', kind: 'length', mm: reserveBudgetMeasurements.fitLocationTirReserve, unitSystem: 'metric' },
        { key: 'workholdingTirReserve', kind: 'length', mm: reserveBudgetMeasurements.workholdingTirReserve, unitSystem: 'metric' },
        { key: 'measurementTirReserve', kind: 'length', mm: reserveBudgetMeasurements.measurementTirReserve, unitSystem: 'metric' },
        { key: 'processTirReserve', kind: 'length', mm: reserveBudgetMeasurements.processTirReserve, unitSystem: 'metric' },
        { key: 'additionalTirReserve', kind: 'length', mm: reserveBudgetMeasurements.additionalTirReserve, unitSystem: 'metric' },
        { key: 'boreDiameterMeasured', kind: 'length', mm: keyedInterfaceMeasurements.spur.boreDiameterMeasuredMm, unitSystem: 'metric' },
        { key: 'shaftDiameterMeasured', kind: 'length', mm: keyedInterfaceMeasurements.spur.shaftDiameterMeasuredMm, unitSystem: 'metric' },
        { key: 'nominalShaftSize', kind: 'length', mm: spurFixture.nominalShaftSizeMm, unitSystem: 'metric' },
        { key: 'pressureAngleDeg', kind: 'angle', value: spurFixture.pressureAngleDeg },
        { key: 'existingKeyWidth', kind: 'length', mm: keyedInterfaceMeasurements.spur.existingKeyWidthMm, unitSystem: 'metric' },
        { key: 'existingKeyDepthHub', kind: 'length', mm: keyedInterfaceMeasurements.spur.existingKeyDepthHubMm, unitSystem: 'metric' }
      ]
    }),
    expectation: {
      status: 'draft',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: [
        'centering-standards-basis-unapproved',
        'diametral-pitch-crosscheck-mismatch',
        'outside-diameter-crosscheck-mismatch',
        'pitch-diameter-crosscheck-mismatch'
      ],
      geometryKind: 'spur',
      centering: buildCenteredExpectation(spurFixture, spurFixture.moduleMm),
      recommendation: {
        fitCode: 'H7/h6',
        nominalSizeMm: 25.4,
        recommendedBoreMinMm: 25.4,
        recommendedBoreMaxMm: 25.421,
        keyWidth: 6.35,
        keywayHubDepth: 3.175
      }
    }
  };
}

function buildFitBoundaryCase(): BenchmarkCase {
  const pitchDiameterMm = 60;
  const moduleMm = 3;
  const boundaryFixture: SpurFixture = {
    ...spurFixture,
    toothCount: 20,
    pitchDiameterMm,
    outsideDiameterMm: 66,
    moduleMm,
    faceWidthMm: 18,
    nominalShaftSizeMm: 30,
    runoutFrMeasuredMm: 0.028,
    mountingFaceRunoutMm: 0.016,
    allowableRunoutFrTUm: 47,
    allowableCenterToleranceTirMm: 0.029
  };

  return {
    id: 'spur-direct-interference-metric-fit-boundary-30mm',
    title: 'Spur direct interference metric boundary fit at 30 mm',
    tags: ['edge', 'fit-boundary', 'pathway:direct-pitch', 'family:spur', 'interface:interference', 'unit:metric'],
    derivationPacket: {
      id: 'spur-direct-fit-boundary-30mm',
      title: 'Spur direct fit boundary derivation',
      path: 'tests/benchmarks/derivations/spur-direct-fit-boundary-30mm.md'
    },
    project: createProject({
      id: 'spur-direct-interference-metric-fit-boundary-30mm',
      title: 'Spur direct interference metric boundary fit at 30 mm',
      gearFamily: 'spur',
      shaftInterface: 'interference',
      unitSystem: 'metric',
      pathwayId: 'direct-pitch',
      isoClass: 8,
      measurements: [
        { key: 'toothCount', kind: 'count', value: 20 },
        { key: 'moduleMetric', kind: 'length', mm: 3, unitSystem: 'metric', forceUnit: 'mm' },
        { key: 'outsideDiameter', kind: 'length', mm: 66, unitSystem: 'metric' },
        { key: 'pitchDiameterKnown', kind: 'length', mm: 60, unitSystem: 'metric' },
        { key: 'faceWidth', kind: 'length', mm: 18, unitSystem: 'metric' },
        { key: 'runoutFrMeasured', kind: 'length', mm: 0.028, unitSystem: 'metric' },
        { key: 'mountingFaceRunout', kind: 'length', mm: 0.016, unitSystem: 'metric' },
        { key: 'fitLocationTirReserve', kind: 'length', mm: reserveBudgetMeasurements.fitLocationTirReserve, unitSystem: 'metric' },
        { key: 'workholdingTirReserve', kind: 'length', mm: reserveBudgetMeasurements.workholdingTirReserve, unitSystem: 'metric' },
        { key: 'measurementTirReserve', kind: 'length', mm: reserveBudgetMeasurements.measurementTirReserve, unitSystem: 'metric' },
        { key: 'processTirReserve', kind: 'length', mm: reserveBudgetMeasurements.processTirReserve, unitSystem: 'metric' },
        { key: 'additionalTirReserve', kind: 'length', mm: reserveBudgetMeasurements.additionalTirReserve, unitSystem: 'metric' },
        { key: 'boreDiameterMeasured', kind: 'length', mm: 30.01, unitSystem: 'metric' },
        { key: 'shaftDiameterMeasured', kind: 'length', mm: 30.038, unitSystem: 'metric' },
        { key: 'nominalShaftSize', kind: 'length', mm: 30, unitSystem: 'metric' },
        { key: 'pressureAngleDeg', kind: 'angle', value: 20 }
      ]
    }),
    expectation: {
      status: 'draft',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: ['centering-standards-basis-unapproved'],
      geometryKind: 'spur',
      geometry: {
        toothCount: 20,
        transverseModuleMm: 3,
        transverseDiametralPitch: 8.466666666666667,
        pitchDiameterMm: 60,
        outsideDiameterMm: 66,
        circularPitchMm: 9.42477796076938,
        pressureAngleDeg: 20
      },
      centering: {
        headline: 'Center before broach',
        referenceDiameterMm: 60,
        pitchDiameterMm: 60,
        outsideDiameterMm: 66,
        normalModuleMm: 3,
        allowableRunoutFrTUm: boundaryFixture.allowableRunoutFrTUm,
        reserveBudgetTotalTirMm: reserveBudgetTotalMm,
        allowableCenterToleranceTirMm: boundaryFixture.allowableCenterToleranceTirMm,
        standardsBasisId: 'iso1328Part1Runout',
        standardsValidationStatus: 'provisional',
        iso1328FlankToleranceClass: 8,
        recordedRunoutFrMm: 0.028,
        recordedMountingFaceRunoutMm: 0.016
      },
      recommendation: {
        fitCode: 'H7/s6',
        nominalSizeMm: 30,
        recommendedBoreMinMm: 30,
        recommendedBoreMaxMm: 30.021,
        expectedInterfaceMinMm: 0.01,
        expectedInterfaceMaxMm: 0.044,
        holeBasis: 'H7',
        shaftBasis: 's6'
      }
    }
  };
}

function buildUnsupportedFamilyCase(): BenchmarkCase {
  return {
    id: 'bevel-replicate-keyed-imperial-unsupported',
    title: 'Bevel replicate keyed imperial unsupported family',
    tags: ['negative', 'unsupported-family', 'family:bevel', 'interface:keyed', 'unit:imperial'],
    derivationPacket: {
      id: 'unsupported-bevel',
      title: 'Unsupported bevel family handling',
      path: 'tests/benchmarks/derivations/unsupported-bevel.md'
    },
    project: createProject({
      id: 'bevel-replicate-keyed-imperial-unsupported',
      title: 'Bevel replicate keyed imperial unsupported family',
      gearFamily: 'bevel',
      shaftInterface: 'keyed',
      unitSystem: 'imperial',
      pathwayId: 'replicate-from-od',
      measurements: [
        { key: 'toothCount', kind: 'count', value: 24 },
        { key: 'outsideDiameter', kind: 'length', mm: 80, unitSystem: 'imperial' },
        { key: 'faceWidth', kind: 'length', mm: 20, unitSystem: 'imperial' },
        { key: 'boreDiameterMeasured', kind: 'length', mm: 25.4, unitSystem: 'imperial' },
        { key: 'shaftDiameterMeasured', kind: 'length', mm: 25.39, unitSystem: 'imperial' },
        { key: 'nominalShaftSize', kind: 'length', mm: 25.4, unitSystem: 'imperial' }
      ]
    }),
    expectation: {
      status: 'blocked',
      releaseGateStatus: 'blocked',
      missingMeasurements: [],
      issueCodes: ['unsupported-combination']
    }
  };
}

function buildRackCenteringPendingHandCheckCase(): BenchmarkCase {
  const benchmark = buildRackCase('rack-centering', 'keyed', 'imperial');
  benchmark.id = 'rack-pinion-rack-centering-keyed-imperial-pending-independent-check';
  benchmark.title = 'Rack and pinion rack-centering keyed imperial pending independent check';
  benchmark.tags = ['edge', 'rack-centering', 'release-gate', 'pending-independent-check', 'family:rackPinion', 'interface:keyed', 'unit:imperial'];
  benchmark.project.releaseChecklistState = {
    standardsBasisConfirmed: true,
    standardsRunoutMethodConfirmed: true,
    damagedToothReviewComplete: true,
    legacyRunoutMethodConfirmed: true,
    centerToleranceBudgetConfirmed: true,
    independentHandCheckComplete: false
  };
  benchmark.expectation.releaseGateStatus = 'blocked';
  return benchmark;
}

function buildRackCenteringDamagedReviewOpenCase(): BenchmarkCase {
  const benchmark = buildRackCase('rack-centering', 'keyed', 'metric');
  benchmark.id = 'rack-pinion-rack-centering-keyed-metric-damaged-review-open';
  benchmark.title = 'Rack and pinion rack-centering keyed metric damaged review open';
  benchmark.tags = ['edge', 'rack-centering', 'damaged-tooth-review', 'family:rackPinion', 'interface:keyed', 'unit:metric'];
  benchmark.project.releaseChecklistState = {
    standardsBasisConfirmed: true,
    standardsRunoutMethodConfirmed: true,
    damagedToothReviewComplete: false,
    legacyRunoutMethodConfirmed: true,
    centerToleranceBudgetConfirmed: true,
    independentHandCheckComplete: true
  };
  benchmark.expectation.releaseGateStatus = 'blocked';
  return benchmark;
}

function buildRackCenteringMissingEvidenceCase(): BenchmarkCase {
  return {
    id: 'rack-pinion-rack-centering-keyed-imperial-missing-evidence',
    title: 'Rack and pinion rack-centering keyed imperial missing centering evidence',
    tags: ['negative', 'rack-centering', 'missing-required', 'family:rackPinion', 'interface:keyed', 'unit:imperial'],
    derivationPacket: {
      id: 'rack-pinion-rack-centering-missing-evidence',
      title: 'Rack and pinion rack-centering missing evidence derivation',
      path: 'tests/benchmarks/derivations/rack-pinion-rack-centering-missing-evidence.md'
    },
    project: createProject({
      id: 'rack-pinion-rack-centering-keyed-imperial-missing-evidence',
      title: 'Rack and pinion rack-centering keyed imperial missing centering evidence',
      gearFamily: 'rackPinion',
      shaftInterface: 'keyed',
      unitSystem: 'imperial',
      pathwayId: 'rack-centering',
      isoClass: rackFixture.isoClass,
      measurements: baseMeasurements(rackFixture, 'imperial', 'keyed', 'rack-centering').filter(
        (measurement) => measurement.key !== 'runoutFrMeasured' && measurement.key !== 'mountingFaceRunout'
      )
    }),
    expectation: {
      status: 'blocked',
      releaseGateStatus: 'blocked',
      missingMeasurements: ['runoutFrMeasured', 'mountingFaceRunout'],
      issueCodes: [
        'centering-standards-basis-unapproved',
        'missing-runout-fr-measurement',
        'centering-setup-evidence-insufficient'
      ],
      geometryKind: 'rackPinion',
      geometry: {
        toothCount: rackFixture.toothCount,
        transverseModuleMm: rackFixture.moduleMm,
        transverseDiametralPitch: rackFixture.diametralPitch,
        pinionPitchDiameterMm: rackFixture.pitchDiameterMm,
        pinionOutsideDiameterMm: rackFixture.outsideDiameterMm,
        circularPitchMm: rackFixture.circularPitchMm,
        rackLinearPitchMm: rackFixture.rackLinearPitchMm
      },
      recommendation: { ...keyedRecommendations.rackPinion }
    }
  };
}

export const positiveBenchmarkCases: BenchmarkCase[] = [
  buildSpurCase('replicate-from-od', 'keyed', 'imperial'),
  buildSpurCase('replicate-from-od', 'keyed', 'metric'),
  buildSpurCase('replicate-from-od', 'interference', 'imperial'),
  buildSpurCase('replicate-from-od', 'interference', 'metric'),
  buildSpurCase('direct-pitch', 'keyed', 'imperial'),
  buildSpurCase('direct-pitch', 'keyed', 'metric'),
  buildSpurCase('direct-pitch', 'interference', 'imperial'),
  buildSpurCase('direct-pitch', 'interference', 'metric'),
  buildHelicalCase('replicate-from-od', 'keyed', 'imperial'),
  buildHelicalCase('replicate-from-od', 'keyed', 'metric'),
  buildHelicalCase('replicate-from-od', 'interference', 'imperial'),
  buildHelicalCase('replicate-from-od', 'interference', 'metric'),
  buildHelicalCase('direct-pitch', 'keyed', 'imperial'),
  buildHelicalCase('direct-pitch', 'keyed', 'metric'),
  buildHelicalCase('direct-pitch', 'interference', 'imperial'),
  buildHelicalCase('direct-pitch', 'interference', 'metric'),
  buildRackCase('replicate-from-od', 'keyed', 'imperial'),
  buildRackCase('replicate-from-od', 'keyed', 'metric'),
  buildRackCase('replicate-from-od', 'interference', 'imperial'),
  buildRackCase('replicate-from-od', 'interference', 'metric'),
  buildRackCase('direct-pitch', 'keyed', 'imperial'),
  buildRackCase('direct-pitch', 'keyed', 'metric'),
  buildRackCase('direct-pitch', 'interference', 'imperial'),
  buildRackCase('direct-pitch', 'interference', 'metric'),
  buildRackCase('rack-centering', 'keyed', 'imperial'),
  buildRackCase('rack-centering', 'keyed', 'metric'),
  buildRackCase('rack-centering', 'interference', 'imperial'),
  buildRackCase('rack-centering', 'interference', 'metric')
];

export const benchmarkCases: BenchmarkCase[] = [
  ...positiveBenchmarkCases,
  buildMissingNominalCase(),
  buildCrossCheckMismatchCase(),
  buildFitBoundaryCase(),
  buildUnsupportedFamilyCase(),
  buildRackCenteringMissingEvidenceCase(),
  buildRackCenteringPendingHandCheckCase(),
  buildRackCenteringDamagedReviewOpenCase()
];

export function cloneProject(project: AnalysisProject) {
  return JSON.parse(JSON.stringify(project)) as AnalysisProject;
}

export function getBenchmarkCase(caseId: string) {
  const benchmarkCase = benchmarkCases.find((entry) => entry.id === caseId);
  if (!benchmarkCase) {
    throw new Error(`Unknown benchmark case: ${caseId}`);
  }

  return benchmarkCase;
}
