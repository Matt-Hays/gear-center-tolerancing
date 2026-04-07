import { getMeasurementDefinition } from '@/data/measurementCatalog';
import type {
  AnalysisProject,
  LegacyAnalysisProjectShape,
  MeasurementRecord,
  ProjectFileV1
} from '@/types/domain';

const STORAGE_KEY = 'gear-bore-tolerancing:draft';

export function serializeProject(project: AnalysisProject): ProjectFileV1 {
  return {
    schemaVersion: 'ProjectFileV1',
    exportedAt: new Date().toISOString(),
    project
  };
}

function cloneMeasurementRecord(record: MeasurementRecord): MeasurementRecord {
  return {
    ...record
  };
}

function migrateRunoutMeasurement(project: AnalysisProject) {
  const hasRunoutFr = project.measurements.some((record) => record.key === 'runoutFrMeasured');
  const legacyToothRunout = project.measurements.find((record) => record.key === 'toothRunoutMeasured');

  if (hasRunoutFr || !legacyToothRunout) {
    return project;
  }

  const runoutDefinition = getMeasurementDefinition('runoutFrMeasured');
  project.measurements = project.measurements.map((record) =>
    record.key === 'toothRunoutMeasured'
      ? {
          ...cloneMeasurementRecord(record),
          key: 'runoutFrMeasured',
          label: runoutDefinition?.label ?? 'Measured runout Fr'
        }
      : cloneMeasurementRecord(record)
  );
  project.legacyCenteringAudit = {
    ...project.legacyCenteringAudit,
    migratedRunoutFrFromToothDatum: true
  };

  return project;
}

function migrateProjectShape(project: AnalysisProject | LegacyAnalysisProjectShape): AnalysisProject {
  const legacyAgmaQQualityNumber = project.agmaQQualityNumber ?? project.agmaQualityGrade;
  const legacyCenteringAudit =
    'legacyCenteringAudit' in project && project.legacyCenteringAudit
      ? project.legacyCenteringAudit
      : undefined;
  const legacyCenterToleranceStandard =
    'centerToleranceStandard' in project ? project.centerToleranceStandard : undefined;
  const legacyAuditRequiresBudgetReset =
    legacyAgmaQQualityNumber !== undefined ||
    legacyCenterToleranceStandard === 'ISO_1328_1_2013_RUNOUT' ||
    legacyCenterToleranceStandard === undefined;
  const migratedProject: AnalysisProject = {
    ...project,
    centerToleranceStandard:
      legacyCenterToleranceStandard === 'iso1328Part2RadialRunout'
        ? 'iso1328Part2RadialRunout'
        : 'iso1328Part1Runout',
    iso1328FlankToleranceClass:
      'iso1328FlankToleranceClass' in project ? project.iso1328FlankToleranceClass : undefined,
    legacyCenteringAudit: {
      legacyAgmaQQualityNumber,
      migratedRunoutFrFromToothDatum: legacyCenteringAudit?.migratedRunoutFrFromToothDatum ?? false,
      requiresStandardsRevalidation:
        legacyCenteringAudit?.requiresStandardsRevalidation ??
        (
          legacyAgmaQQualityNumber !== undefined ||
          legacyCenterToleranceStandard === 'ISO_1328_1_2013_RUNOUT' ||
          legacyCenterToleranceStandard === undefined
        )
    },
    releaseChecklistState: {
      standardsBasisConfirmed: project.releaseChecklistState?.standardsBasisConfirmed ?? false,
      standardsRunoutMethodConfirmed:
        project.releaseChecklistState?.standardsRunoutMethodConfirmed ??
        project.releaseChecklistState?.legacyRunoutMethodConfirmed ??
        false,
      damagedToothReviewComplete: project.releaseChecklistState?.damagedToothReviewComplete ?? false,
      legacyRunoutMethodConfirmed: project.releaseChecklistState?.legacyRunoutMethodConfirmed ?? false,
      centerToleranceBudgetConfirmed:
        legacyAuditRequiresBudgetReset ? false : project.releaseChecklistState?.centerToleranceBudgetConfirmed ?? false,
      independentHandCheckComplete: project.releaseChecklistState?.independentHandCheckComplete ?? false
    },
    measurements: project.measurements.map((record) => cloneMeasurementRecord(record))
  };

  return migrateRunoutMeasurement(migratedProject);
}

export function parseProjectFile(raw: string) {
  const parsed = JSON.parse(raw) as ProjectFileV1;
  if (parsed.schemaVersion !== 'ProjectFileV1') {
    throw new Error('Unsupported project file version.');
  }
  return migrateProjectShape(parsed.project);
}

export function saveDraft(project: AnalysisProject) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  return migrateProjectShape(JSON.parse(raw) as AnalysisProject | LegacyAnalysisProjectShape);
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
