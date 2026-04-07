export type SupportedGearFamily = 'spur' | 'helical' | 'rackPinion';
export type UnsupportedGearFamily = 'bevel' | 'worm' | 'hypoid';
export type GearFamily = SupportedGearFamily | UnsupportedGearFamily;
export type SolverId = SupportedGearFamily;
export type PathwayId = 'replicate-from-od' | 'direct-pitch' | 'rack-centering';
export type ShaftInterface = 'keyed' | 'interference';
export type UnitSystem = 'imperial' | 'metric';
export type LengthUnit = 'in' | 'mm';
export type MeasurementUnit = LengthUnit | 'deg' | 'count' | 'ratio' | 'um';
export type AgmaQQualityNumber = 6 | 8 | 10 | 12;
export type Iso1328FlankToleranceClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type CenterToleranceStandard = 'iso1328Part1Runout' | 'iso1328Part2RadialRunout';
export type CenteringValidationStatus = 'approved' | 'provisional' | 'disabled';
export type CenteringReleaseMode = 'standardsOnly' | 'standardsPlusReserveBudget';
export type AppliedCenteringLimitStatus = 'approved' | 'unapproved';
export type ThemePreference = 'system' | 'light' | 'dark';
export type RecommendationStatus = 'draft' | 'blocked' | 'reviewReady';
export type ReleaseGateStatus = 'blocked' | 'pendingIndependentCheck' | 'readyForMachiningReview';
export type GeometrySolveStatus = 'solved' | 'blocked';
export type ValidationSeverity = 'info' | 'warning' | 'error';
export type DutyClass = 'light' | 'normal' | 'shock';
export type MeasurementDimension = 'length' | 'angle' | 'count' | 'ratio';
export type MeasurementStep = 'geometry' | 'interface' | 'centering' | 'validation';
export type StandardsRoundingMode = 'iso1328Clause5.2.3Micrometre';

export type MeasurementKey =
  | 'toothCount'
  | 'outsideDiameter'
  | 'faceWidth'
  | 'boreDiameterMeasured'
  | 'shaftDiameterMeasured'
  | 'nominalShaftSize'
  | 'pressureAngleDeg'
  | 'helixAngleDeg'
  | 'rackLinearPitch'
  | 'moduleMetric'
  | 'diametralPitch'
  | 'pitchDiameterKnown'
  | 'existingKeyWidth'
  | 'existingKeyDepthHub'
  | 'runoutFrMeasured'
  | 'toothRunoutMeasured'
  | 'mountingFaceRunout'
  | 'fitLocationTirReserve'
  | 'workholdingTirReserve'
  | 'measurementTirReserve'
  | 'processTirReserve'
  | 'additionalTirReserve';

export type CanonicalUnitForDimension<T extends MeasurementDimension> = T extends 'length'
  ? 'mm'
  : T extends 'angle'
    ? 'deg'
    : T extends 'count'
      ? 'count'
      : 'ratio';

export interface MeasurementRecord {
  key: MeasurementKey;
  label: string;
  value?: number;
  unit: MeasurementUnit;
  method: string;
  instrument: string;
  uncertainty?: number;
  notes?: string;
}

export interface MeasurementDefinition {
  key: MeasurementKey;
  label: string;
  description: string;
  unit: MeasurementUnit;
  dimension: MeasurementDimension;
  step: MeasurementStep;
  applicableFamilies?: GearFamily[];
  applicableInterfaces?: ShaftInterface[];
  placeholder?: string;
}

export interface MeasurementConsistencyRule {
  id: string;
  title: string;
  keys: MeasurementKey[];
  tolerance?: number;
}

export interface MeasurementPathway {
  id: PathwayId;
  title: string;
  description: string;
  supportedFamilies: SupportedGearFamily[];
  requiredKeys: MeasurementKey[];
  optionalKeys?: MeasurementKey[];
  crossCheckKeys?: MeasurementKey[];
  familySpecificRequired?: Partial<Record<SupportedGearFamily, MeasurementKey[]>>;
  familySpecificOptional?: Partial<Record<SupportedGearFamily, MeasurementKey[]>>;
  familySpecificCrossChecks?: Partial<Record<SupportedGearFamily, MeasurementKey[]>>;
  interfaceSpecificRequired?: Partial<Record<ShaftInterface, MeasurementKey[]>>;
  interfaceSpecificOptional?: Partial<Record<ShaftInterface, MeasurementKey[]>>;
  oneOfGroups?: MeasurementKey[][];
  consistencyRules?: MeasurementConsistencyRule[];
}

export interface MeasurementValue<TDimension extends MeasurementDimension = MeasurementDimension> {
  key: MeasurementKey;
  label: string;
  dimension: TDimension;
  rawValue: number;
  rawUnit: MeasurementUnit;
  canonicalValue: number;
  canonicalUnit: CanonicalUnitForDimension<TDimension>;
  method: string;
  instrument: string;
  uncertainty?: number;
  notes?: string;
}

export type NormalizedMeasurementSet = Partial<Record<MeasurementKey, MeasurementValue>>;

export interface StandardsReference {
  code: string;
  title: string;
  url: string;
}

export interface FitToleranceBand {
  minDiameterMm: number;
  maxDiameterMm: number;
  holeLowerUm: number;
  holeUpperUm: number;
  shaftLowerUm: number;
  shaftUpperUm: number;
}

export interface FitDefinition {
  code: string;
  title: string;
  holeBasis: string;
  shaftBasis: string;
  intent: string;
  bands: FitToleranceBand[];
}

export interface KeySizeDefinition {
  minShaft: number;
  maxShaft: number;
  width: number;
  height: number;
  hubKeyseatDepth: number;
  widthTolerance: number;
  depthTolerance: number;
  unit: LengthUnit;
}

export interface StandardsProfile {
  id: string;
  name: string;
  version: string;
  basisLabel: string;
  basisVersion: string;
  summary: string;
  provisional: boolean;
  releaseNote: string;
  references: StandardsReference[];
  fitDefinitions: {
    keyed: FitDefinition;
    interferenceByDuty: Record<DutyClass, FitDefinition>;
  };
  defaultCenterToleranceStandard: CenterToleranceStandard;
  centeringStandardsBases: Record<CenterToleranceStandard, {
    id: CenterToleranceStandard;
    releaseMode: CenteringReleaseMode;
    displayLabel: string;
    standardCode: string;
    standardTitle: string;
    standardEdition: string;
    quantityName: string;
    quantitySymbol: string;
    quantityReference: string;
    clauseReference: string;
    sourceReference: string;
    sourceUrl: string;
    measurementMethodLabel: string;
    measurementMethodNote: string;
    variableDefinitions: {
      referenceDiameter: string;
      normalModule: string;
      flankToleranceClass: string;
      toothCount: string;
      faceWidth: string;
      helixAngle: string;
    };
    validation: {
      status: CenteringValidationStatus;
      artifactPath: string;
      artifactRevision: string;
      note: string;
      approvedBy?: string;
      approvedAt?: string;
    };
    applicability: {
      toothCount: {
        min: number;
        max: number;
      };
      referenceDiameterMm: {
        min: number;
        max: number;
      };
      normalModuleMm: {
        min: number;
        max: number;
      };
      faceWidthMm: {
        min: number;
        max: number;
      };
      helixAngleAbsDeg: {
        max: number;
      };
    };
    rounding: {
      mode: StandardsRoundingMode;
      description: string;
    };
    formula?: {
      equationId: string;
      expression: string;
      runoutFactor: number;
      referenceDiameterCoeff: number;
      sqrtReferenceDiameterCoeff: number;
      normalModuleCoeff: number;
      constant: number;
      classFactorBase: number;
      classFactorReferenceClass: number;
    };
    engineeringAcceptanceNote: string;
    classNumbers: Iso1328FlankToleranceClass[];
    setupGuidanceReferences: StandardsReference[];
    internalAppliedLimit: {
      status: AppliedCenteringLimitStatus;
      label: string;
      note: string;
      equationId: string;
    };
  }>;
  keyDefinitions: {
    imperial: KeySizeDefinition[];
    metric: KeySizeDefinition[];
  };
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  field?: MeasurementKey;
}

export interface UnsupportedCombinationIssue extends ValidationIssue {
  code: 'unsupported-combination';
  unsupportedFamily: GearFamily;
}

export interface DerivedValue {
  key: string;
  label: string;
  value: number;
  unit: MeasurementUnit;
  source: string;
  sourceMeasurementKeys: MeasurementKey[];
  equationId: string;
  roundingRule: string;
  branchId: string;
}

export interface TraceStep {
  id: string;
  title: string;
  detail: string;
  reference: string;
  equation?: string;
  equationId: string;
  branchId: string;
  outputs: DerivedValue[];
}

export interface SpurGeometry {
  family: 'spur';
  toothCount: number;
  transverseModuleMm: number;
  transverseDiametralPitch: number;
  pitchDiameterMm: number;
  outsideDiameterMm: number;
  circularPitchMm: number;
  pressureAngleDeg?: number;
}

export interface HelicalGeometry {
  family: 'helical';
  toothCount: number;
  helixAngleDeg: number;
  transverseModuleMm: number;
  normalModuleMm: number;
  transverseDiametralPitch: number;
  pitchDiameterMm: number;
  outsideDiameterMm: number;
  transverseCircularPitchMm: number;
  normalCircularPitchMm: number;
  leadMm: number;
  pressureAngleDeg?: number;
}

export interface RackPinionGeometry {
  family: 'rackPinion';
  toothCount: number;
  transverseModuleMm: number;
  transverseDiametralPitch: number;
  pinionPitchDiameterMm: number;
  pinionOutsideDiameterMm: number;
  circularPitchMm: number;
  rackLinearPitchMm: number;
  pressureAngleDeg?: number;
}

export type SupportedGeometry = SpurGeometry | HelicalGeometry | RackPinionGeometry;

export interface GeometrySolveRequest {
  gearFamily: GearFamily;
  pathwayId: PathwayId;
  measurements: NormalizedMeasurementSet;
}

export interface GeometrySolveResult<TGeometry extends SupportedGeometry = SupportedGeometry> {
  solverId: SolverId;
  pathwayId: PathwayId;
  status: GeometrySolveStatus;
  geometry?: TGeometry;
  missingMeasurements: MeasurementKey[];
  issues: ValidationIssue[];
  derivedValues: DerivedValue[];
  traceSteps: TraceStep[];
}

export interface ToleranceRecommendation {
  status: RecommendationStatus;
  headline: string;
  fitCode: string;
  fitIntent: string;
  nominalSizeMm?: number;
  recommendedBoreMinMm?: number;
  recommendedBoreMaxMm?: number;
  expectedInterfaceMinMm?: number;
  expectedInterfaceMaxMm?: number;
  holeBasis?: string;
  shaftBasis?: string;
  keyWidth?: number;
  keyHeight?: number;
  keywayHubDepth?: number;
  keywayWidthTolerance?: number;
  keywayDepthTolerance?: number;
  notes: string[];
}

export interface CenteringResult {
  family: SupportedGearFamily;
  headline: string;
  governingGeometryBasis: string;
  boreCenterBasis: string;
  standardsBasisId: CenterToleranceStandard;
  standardsBasisLabel: string;
  standardsValidationStatus: CenteringValidationStatus;
  standardsValidationArtifactPath: string;
  standardsQuantityName: string;
  standardsQuantitySymbol: string;
  standardsClauseReference: string;
  referenceDiameterMm: number;
  pitchDiameterMm: number;
  outsideDiameterMm: number;
  normalModuleMm: number;
  allowableRunoutFrTUm: number;
  allowableRunoutFrTMm: number;
  allowableRunoutFrTDisplay: string;
  appliedCenteringLimitStatus: AppliedCenteringLimitStatus;
  allowableCenterToleranceTirMm?: number;
  allowableCenterToleranceDisplay?: string;
  reserveBudgetTotalTirMm?: number;
  equivalentRadialOffsetMm?: number;
  iso1328FlankToleranceClass: Iso1328FlankToleranceClass;
  toleranceBasisReference: string;
  acceptanceModeNote: string;
  standardsAcceptancePass: boolean;
  setupEvidenceComplete: boolean;
  standardsRunoutMethodConfirmed: boolean;
  legacyRunoutMethodConfirmationRequired: boolean;
  centerToleranceBudgetComplete: boolean;
  centerToleranceBudgetConfirmed: boolean;
  releaseBlockReasons: string[];
  centerHeightFromRackPitchLineMm?: number;
  pitchRadiusMm?: number;
  outsideRadiusMm?: number;
  addendumMm?: number;
  rackLinearPitchMm?: number;
  recordedRunoutFrMm?: number;
  recordedMountingFaceRunoutMm?: number;
  inspectionChecks: string[];
  machiningNotes: string[];
}

export type ControlledNumericParseState = 'empty' | 'parsed' | 'intermediate' | 'invalid';

export interface ControlledNumericParseResult {
  status: ControlledNumericParseState;
  rawText: string;
  normalizedText: string;
  value?: number;
}

export interface VisualAuditCase {
  id: string;
  route: string;
  viewport: {
    width: number;
    height: number;
  };
  theme: 'light' | 'dark';
  fixture: 'default' | 'stress';
  watchedSelectors: string[];
}

export interface ReleaseChecklistState {
  standardsBasisConfirmed: boolean;
  standardsRunoutMethodConfirmed: boolean;
  damagedToothReviewComplete: boolean;
  legacyRunoutMethodConfirmed: boolean;
  centerToleranceBudgetConfirmed: boolean;
  independentHandCheckComplete: boolean;
}

export interface ReleaseChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  required: boolean;
  note?: string;
}

export interface CalculationTrace {
  standardsProfileId: string;
  generatedAt: string;
  steps: TraceStep[];
}

export interface AnalysisResult {
  status: RecommendationStatus;
  pathwayId: PathwayId;
  missingMeasurements: MeasurementKey[];
  issues: ValidationIssue[];
  normalizedMeasurements: NormalizedMeasurementSet;
  geometryResult?: GeometrySolveResult;
  derivedValues: DerivedValue[];
  recommendation?: ToleranceRecommendation;
  centeringResult?: CenteringResult;
  releaseGateStatus: ReleaseGateStatus;
  releaseChecklist: ReleaseChecklistItem[];
  trace: CalculationTrace;
  standardsProfile: StandardsProfile;
}

export interface AnalysisProject {
  id: string;
  name: string;
  analyst: string;
  customer: string;
  partNumber: string;
  notes: string;
  gearFamily: GearFamily;
  shaftInterface: ShaftInterface;
  unitSystem: UnitSystem;
  dutyClass: DutyClass;
  centerToleranceStandard: CenterToleranceStandard;
  iso1328FlankToleranceClass?: Iso1328FlankToleranceClass;
  standardsProfileId: string;
  selectedPathwayId: PathwayId;
  createdAt: string;
  updatedAt: string;
  legacyCenteringAudit?: {
    legacyAgmaQQualityNumber?: AgmaQQualityNumber;
    migratedRunoutFrFromToothDatum?: boolean;
    requiresStandardsRevalidation?: boolean;
  };
  releaseChecklistState: ReleaseChecklistState;
  measurements: MeasurementRecord[];
}

export interface LegacyAnalysisProjectShape
  extends Omit<AnalysisProject, 'centerToleranceStandard' | 'iso1328FlankToleranceClass' | 'legacyCenteringAudit'> {
  agmaQualityGrade?: AgmaQQualityNumber;
  agmaQQualityNumber?: AgmaQQualityNumber;
}

export interface ProjectFileV1 {
  schemaVersion: 'ProjectFileV1';
  exportedAt: string;
  project: AnalysisProject | LegacyAnalysisProjectShape;
}

export interface DerivationPacketRef {
  id: string;
  title: string;
  path: string;
}

export interface BenchmarkExpectation {
  status: RecommendationStatus;
  releaseGateStatus?: ReleaseGateStatus;
  missingMeasurements: MeasurementKey[];
  issueCodes: string[];
  geometryKind?: SupportedGearFamily;
  geometry?: Record<string, number>;
  recommendation?: Record<string, string | number>;
  centering?: Record<string, string | number>;
}

export interface BenchmarkCase {
  id: string;
  title: string;
  tags: string[];
  derivationPacket: DerivationPacketRef;
  project: AnalysisProject;
  expectation: BenchmarkExpectation;
}
