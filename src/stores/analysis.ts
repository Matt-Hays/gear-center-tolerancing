import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { getMeasurementDefinition, getVisibleMeasurements, measurementPathways } from '@/data/measurementCatalog';
import { standardsProfiles } from '@/data/standardsProfiles';
import { createSampleProject } from '@/data/sampleProjects';
import { analyzeProject } from '@/lib/calculations/engine';
import { parseProjectFile, saveDraft, loadDraft, serializeProject } from '@/lib/io/projectFiles';
import { defaultLengthUnit, fromMillimeters, resolveLengthRecordMm, suggestNominalSize, toMillimeters } from '@/lib/units';
import type {
  AnalysisProject,
  DutyClass,
  GearFamily,
  Iso1328FlankToleranceClass,
  MeasurementDefinition,
  MeasurementRecord,
  MeasurementUnit,
  PathwayId,
  ReleaseChecklistState,
  ShaftInterface,
  UnitSystem
} from '@/types/domain';

function createMeasurementRecord(definition: MeasurementDefinition, unitSystem: UnitSystem): MeasurementRecord {
  const unit: MeasurementUnit =
    definition.dimension === 'length' && definition.key !== 'moduleMetric'
      ? defaultLengthUnit(unitSystem)
      : definition.unit === 'in'
        ? 'in'
        : definition.unit;

  return {
    key: definition.key,
    label: definition.label,
    unit,
    method: '',
    instrument: '',
    notes: '',
    uncertainty: undefined
  };
}

function ensureMeasurementCatalog(project: AnalysisProject) {
  const existing = new Map(project.measurements.map((record) => [record.key, record]));
  const merged = Array.from(existing.values());

  for (const key of [
    'toothCount',
    'outsideDiameter',
    'faceWidth',
    'boreDiameterMeasured',
    'shaftDiameterMeasured',
    'nominalShaftSize',
    'pressureAngleDeg',
    'helixAngleDeg',
    'rackLinearPitch',
    'moduleMetric',
    'diametralPitch',
    'pitchDiameterKnown',
    'existingKeyWidth',
    'existingKeyDepthHub',
    'runoutFrMeasured',
    'mountingFaceRunout',
    'fitLocationTirReserve',
    'workholdingTirReserve',
    'measurementTirReserve',
    'processTirReserve',
    'additionalTirReserve'
  ] as const) {
    if (!existing.has(key)) {
      const definition = getMeasurementDefinition(key);
      if (definition) {
        merged.push(createMeasurementRecord(definition, project.unitSystem));
      }
    }
  }

  project.measurements = merged;
  return project;
}

function ensureReleaseChecklistState(project: AnalysisProject) {
  project.releaseChecklistState = {
    standardsBasisConfirmed: project.releaseChecklistState?.standardsBasisConfirmed ?? false,
    standardsRunoutMethodConfirmed:
      project.releaseChecklistState?.standardsRunoutMethodConfirmed ??
      project.releaseChecklistState?.legacyRunoutMethodConfirmed ??
      false,
    damagedToothReviewComplete: project.releaseChecklistState?.damagedToothReviewComplete ?? false,
    legacyRunoutMethodConfirmed: project.releaseChecklistState?.legacyRunoutMethodConfirmed ?? false,
    centerToleranceBudgetConfirmed: project.releaseChecklistState?.centerToleranceBudgetConfirmed ?? false,
    independentHandCheckComplete: project.releaseChecklistState?.independentHandCheckComplete ?? false
  };

  return project;
}

function preferredPathwayForFamily(gearFamily: GearFamily): PathwayId {
  return gearFamily === 'rackPinion' ? 'rack-centering' : 'replicate-from-od';
}

function ensureSupportedPathway(project: AnalysisProject) {
  const selected = measurementPathways.find((pathway) => pathway.id === project.selectedPathwayId);
  if (selected && selected.supportedFamilies.includes(project.gearFamily as never)) {
    return project;
  }

  project.selectedPathwayId = preferredPathwayForFamily(project.gearFamily);
  return project;
}

function createEmptyProject(): AnalysisProject {
  const now = new Date().toISOString();
  const unitSystem: UnitSystem = 'imperial';

  return ensureSupportedPathway(ensureReleaseChecklistState(ensureMeasurementCatalog({
    id: crypto.randomUUID(),
    name: 'Rack centering job',
    analyst: '',
    customer: '',
    partNumber: '',
    notes: '',
    gearFamily: 'rackPinion',
    shaftInterface: 'keyed',
    unitSystem,
    dutyClass: 'normal',
    centerToleranceStandard: 'iso1328Part1Runout',
    iso1328FlankToleranceClass: undefined,
    standardsProfileId: standardsProfiles[0].id,
    selectedPathwayId: 'rack-centering',
    createdAt: now,
    updatedAt: now,
    releaseChecklistState: {
      standardsBasisConfirmed: false,
      standardsRunoutMethodConfirmed: false,
      damagedToothReviewComplete: false,
      legacyRunoutMethodConfirmed: false,
      centerToleranceBudgetConfirmed: false,
      independentHandCheckComplete: false
    },
    measurements: []
  })));
}

export const useAnalysisStore = defineStore('analysis', () => {
  const project = ref<AnalysisProject>(
    ensureSupportedPathway(ensureReleaseChecklistState(ensureMeasurementCatalog(loadDraft() ?? createEmptyProject())))
  );
  const result = computed(() => analyzeProject(project.value));
  const availableMeasurements = computed(() =>
    getVisibleMeasurements(project.value.gearFamily, project.value.shaftInterface, project.value.selectedPathwayId)
  );

  function touch() {
    project.value.updatedAt = new Date().toISOString();
  }

  watch(
    project,
    (value) => {
      saveDraft(value);
    },
    { deep: true }
  );

  function resetProject() {
    project.value = createEmptyProject();
  }

  function loadSampleProject() {
    project.value = ensureSupportedPathway(ensureReleaseChecklistState(ensureMeasurementCatalog(createSampleProject())));
  }

  function importProject(raw: string) {
    project.value = ensureSupportedPathway(ensureReleaseChecklistState(ensureMeasurementCatalog(parseProjectFile(raw))));
  }

  function exportProject() {
    return serializeProject(project.value);
  }

  function setMeta<K extends keyof AnalysisProject>(key: K, value: AnalysisProject[K]) {
    project.value[key] = value;
    touch();
  }

  function setGearFamily(value: GearFamily) {
    project.value.gearFamily = value;
    ensureSupportedPathway(project.value);
    touch();
  }

  function setShaftInterface(value: ShaftInterface) {
    project.value.shaftInterface = value;
    touch();
  }

  function setDutyClass(value: DutyClass) {
    project.value.dutyClass = value;
    touch();
  }

  function setIso1328FlankToleranceClass(value?: Iso1328FlankToleranceClass) {
    project.value.iso1328FlankToleranceClass = value;
    touch();
  }

  function setPathway(pathwayId: PathwayId) {
    project.value.selectedPathwayId = pathwayId;
    touch();
  }

  function setUnitSystem(unitSystem: UnitSystem) {
    const nextUnit = defaultLengthUnit(unitSystem);

    project.value.measurements = project.value.measurements.map((record) => {
      if (record.key === 'moduleMetric') {
        return record;
      }

      if (record.value === undefined || (record.unit !== 'mm' && record.unit !== 'in')) {
        return {
          ...record,
          unit: record.unit === 'mm' || record.unit === 'in' ? nextUnit : record.unit
        };
      }

      const valueMm = toMillimeters(record.value, record.unit);
      return {
        ...record,
        unit: nextUnit,
        value: fromMillimeters(valueMm, nextUnit)
      };
    });

    project.value.unitSystem = unitSystem;
    touch();
  }

  function updateMeasurement(key: MeasurementRecord['key'], patch: Partial<MeasurementRecord>) {
    project.value.measurements = project.value.measurements.map((record) =>
      record.key === key ? { ...record, ...patch } : record
    );
    touch();
  }

  function updateReleaseChecklist<K extends keyof ReleaseChecklistState>(key: K, value: ReleaseChecklistState[K]) {
    project.value.releaseChecklistState = {
      ...project.value.releaseChecklistState,
      [key]: value
    };
    touch();
  }

  function suggestAndApplyNominal() {
    const shaftRecord = project.value.measurements.find((record) => record.key === 'shaftDiameterMeasured');
    const nominalRecord = project.value.measurements.find((record) => record.key === 'nominalShaftSize');

    if (!shaftRecord || shaftRecord.value === undefined || !nominalRecord) {
      return;
    }

    const shaftMm = resolveLengthRecordMm(shaftRecord);
    if (shaftMm === undefined) {
      return;
    }

    const suggestedMm = suggestNominalSize(shaftMm, project.value.unitSystem);
    const unit = defaultLengthUnit(project.value.unitSystem);
    updateMeasurement('nominalShaftSize', {
      value: fromMillimeters(suggestedMm, unit),
      unit,
      method: 'Suggested from measured shaft size',
      instrument: 'App nominal helper'
    });
  }

  return {
    project,
    result,
    availableMeasurements,
    pathways: measurementPathways,
    profiles: standardsProfiles,
    resetProject,
    loadSampleProject,
    importProject,
    exportProject,
    setMeta,
    setGearFamily,
    setShaftInterface,
    setDutyClass,
    setIso1328FlankToleranceClass,
    setPathway,
    setUnitSystem,
    updateMeasurement,
    updateReleaseChecklist,
    suggestAndApplyNominal
  };
});
