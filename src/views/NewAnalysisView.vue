<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import MeasurementField from '@/components/MeasurementField.vue';
import { getRequiredKeys } from '@/data/measurementCatalog';
import { CENTER_TOLERANCE_METHOD_DEFAULTS, CENTER_TOLERANCE_METHOD_STEPS } from '@/lib/guides/centerToleranceBudget';
import { useAnalysisStore } from '@/stores/analysis';
import type {
  GearFamily,
  Iso1328FlankToleranceClass,
  ShaftInterface,
  SupportedGearFamily,
  UnitSystem
} from '@/types/domain';

const store = useAnalysisStore();

const requiredKeys = computed(
  () => new Set(getRequiredKeys(store.project.selectedPathwayId, store.project.gearFamily, store.project.shaftInterface))
);

const groupedMeasurements = computed(() => ({
  geometry: store.availableMeasurements.filter((definition) => definition.step === 'geometry'),
  centering: store.availableMeasurements.filter((definition) => definition.step === 'centering'),
  interface: store.availableMeasurements.filter((definition) => definition.step === 'interface'),
  validation: store.availableMeasurements.filter((definition) => definition.step === 'validation')
}));

const shaftInterfaces: { label: string; value: ShaftInterface }[] = [
  { label: 'Keyed', value: 'keyed' },
  { label: 'Interference fit', value: 'interference' }
];

const unitSystems: { label: string; value: UnitSystem }[] = [
  { label: 'Imperial', value: 'imperial' },
  { label: 'Metric', value: 'metric' }
];

const supportedPathways = computed(() =>
  store.pathways.filter((item) => item.supportedFamilies.includes(store.project.gearFamily as SupportedGearFamily))
);

const primaryRackPathway = computed(() =>
  store.project.gearFamily === 'rackPinion'
    ? supportedPathways.value.find((pathway) => pathway.id === 'rack-centering')
    : undefined
);

const secondaryPathways = computed(() =>
  store.project.gearFamily === 'rackPinion'
    ? supportedPathways.value.filter((pathway) => pathway.id !== 'rack-centering')
    : supportedPathways.value
);

const activeStandardsBasis = computed(
  () =>
    store.result.standardsProfile.centeringStandardsBases[store.project.centerToleranceStandard] ??
    store.result.standardsProfile.centeringStandardsBases[store.result.standardsProfile.defaultCenterToleranceStandard]
);

const isoClasses = computed(() => activeStandardsBasis.value.classNumbers);

function recordFor(key: string) {
  return store.project.measurements.find((record) => record.key === key)!;
}

function onMetaInput(key: 'name' | 'analyst' | 'customer' | 'partNumber' | 'notes', event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  store.setMeta(key, target.value);
}

function onGearFamilyChange(event: Event) {
  store.setGearFamily((event.target as HTMLSelectElement).value as GearFamily);
}

function onShaftInterfaceChange(event: Event) {
  store.setShaftInterface((event.target as HTMLSelectElement).value as ShaftInterface);
}

function onUnitSystemChange(event: Event) {
  store.setUnitSystem((event.target as HTMLSelectElement).value as UnitSystem);
}

function onDutyClassChange(event: Event) {
  store.setDutyClass((event.target as HTMLSelectElement).value as typeof store.project.dutyClass);
}

function selectGearFamily(value: GearFamily) {
  store.setGearFamily(value);
}

function onIso1328FlankClassChange(event: Event) {
  const next = (event.target as HTMLSelectElement).value;
  store.setIso1328FlankToleranceClass(
    next === '' ? undefined : (Number(next) as Iso1328FlankToleranceClass)
  );
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Inputs</p>
    <h2 class="hero-title">Capture the job.</h2>
    <p class="hero-copy">
      Capture only the measurements needed for the selected path. Rack and pinion is the primary field workflow for
      this release.
    </p>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Setup</p>
        <h2 class="section-title">Job</h2>
      </div>
    </div>

    <div class="field-grid">
      <label class="field-control">
        <span>Project name</span>
        <input class="field-input" :value="store.project.name" type="text" @input="onMetaInput('name', $event)" />
      </label>
      <label class="field-control">
        <span>Analyst</span>
        <input class="field-input" :value="store.project.analyst" type="text" @input="onMetaInput('analyst', $event)" />
      </label>
      <label class="field-control">
        <span>Customer / program</span>
        <input class="field-input" :value="store.project.customer" type="text" @input="onMetaInput('customer', $event)" />
      </label>
      <label class="field-control">
        <span>Part number</span>
        <input class="field-input" :value="store.project.partNumber" type="text" @input="onMetaInput('partNumber', $event)" />
      </label>
      <label class="field-control field-control-wide">
        <span>Notes</span>
        <textarea
          class="field-input field-textarea"
          rows="3"
          :value="store.project.notes"
          @input="onMetaInput('notes', $event)"
        />
      </label>
    </div>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Setup</p>
        <h2 class="section-title">Workflow</h2>
      </div>
    </div>

    <div class="summary-grid">
      <article class="pathway-card" :class="{ active: store.project.gearFamily === 'rackPinion' }">
        <p class="eyebrow">Primary</p>
        <h3>Rack &amp; pinion</h3>
        <p class="supporting-copy">Use the center-before-broach path for the field release workflow.</p>
        <button type="button" class="action-button" @click="selectGearFamily('rackPinion')">Use rack workflow</button>
      </article>

      <article class="field-card">
        <p class="eyebrow">Other gear types</p>
        <h3 class="field-title">Secondary workflows</h3>
        <p class="supporting-copy">Spur and helical remain available but are not the primary field path.</p>
        <div class="button-row">
          <button type="button" class="ghost-button" @click="selectGearFamily('spur')">Spur</button>
          <button type="button" class="ghost-button" @click="selectGearFamily('helical')">Helical</button>
        </div>
      </article>
    </div>

    <div class="field-grid">
      <label class="field-control">
        <span>Gear family</span>
        <select class="field-input" :value="store.project.gearFamily" @change="onGearFamilyChange">
          <option value="rackPinion">Rack and pinion</option>
          <option value="spur">Spur</option>
          <option value="helical">Helical</option>
        </select>
      </label>
      <label class="field-control">
        <span>Shaft interface</span>
        <select class="field-input" :value="store.project.shaftInterface" @change="onShaftInterfaceChange">
          <option v-for="option in shaftInterfaces" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="field-control">
        <span>Unit system</span>
        <select class="field-input" :value="store.project.unitSystem" @change="onUnitSystemChange">
          <option v-for="option in unitSystems" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="field-control">
        <span>Duty class</span>
        <select class="field-input" :value="store.project.dutyClass" @change="onDutyClassChange">
          <option value="light">Light</option>
          <option value="normal">Normal</option>
          <option value="shock">Shock / reversing</option>
        </select>
      </label>
      <label class="field-control">
        <span>{{ activeStandardsBasis.displayLabel }}</span>
        <select
          class="field-input"
          :value="store.project.iso1328FlankToleranceClass ?? ''"
          @change="onIso1328FlankClassChange"
        >
          <option value="">Select ISO flank tolerance class</option>
          <option v-for="isoClass in isoClasses" :key="isoClass" :value="isoClass">Class {{ isoClass }}</option>
        </select>
      </label>
    </div>

    <div class="summary-grid">
      <div class="issue-card info">
        <h3>ISO flank tolerance class</h3>
        <p class="issue-text">
          The standards quantity remains blocked until an ISO flank tolerance class is selected intentionally.
        </p>
      </div>

      <div class="issue-card warning">
        <h3>{{ activeStandardsBasis.standardCode }}</h3>
        <p class="issue-text">
          {{ activeStandardsBasis.validation.status === 'approved'
            ? 'Approved standards basis is active.'
            : activeStandardsBasis.validation.note }}
        </p>
      </div>
    </div>

    <div v-if="primaryRackPathway" class="summary-grid">
      <button
        type="button"
        class="pathway-card"
        :class="{ active: store.project.selectedPathwayId === primaryRackPathway.id }"
        @click="store.setPathway(primaryRackPathway.id)"
      >
        <p class="eyebrow">Primary path</p>
        <h3>{{ primaryRackPathway.title }}</h3>
        <p class="supporting-copy">{{ primaryRackPathway.description }}</p>
      </button>

      <details class="details-block">
        <summary>Other pathways</summary>
        <div class="details-content card-grid">
          <button
            v-for="pathway in secondaryPathways"
            :key="pathway.id"
            type="button"
            class="pathway-card"
            :class="{ active: store.project.selectedPathwayId === pathway.id }"
            @click="store.setPathway(pathway.id)"
          >
            <p class="eyebrow">Secondary path</p>
            <h3>{{ pathway.title }}</h3>
            <p class="supporting-copy">{{ pathway.description }}</p>
          </button>
        </div>
      </details>
    </div>

    <div v-else class="card-grid">
      <button
        v-for="pathway in secondaryPathways"
        :key="pathway.id"
        type="button"
        class="pathway-card"
        :class="{ active: store.project.selectedPathwayId === pathway.id }"
        @click="store.setPathway(pathway.id)"
      >
        <p class="eyebrow">Path</p>
        <h3>{{ pathway.title }}</h3>
        <p class="supporting-copy">{{ pathway.description }}</p>
      </button>
    </div>
  </section>

  <section v-if="groupedMeasurements.geometry.length" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Inputs</p>
        <h2 class="section-title">Geometry</h2>
      </div>
      <p class="meta-text">Required fields are marked with an asterisk.</p>
    </div>

    <div class="card-grid">
      <MeasurementField
        v-for="definition in groupedMeasurements.geometry"
        :key="definition.key"
        :definition="definition"
        :model-value="recordFor(definition.key)"
        :required="requiredKeys.has(definition.key)"
        :unit-system="store.project.unitSystem"
        @update:model-value="store.updateMeasurement(definition.key, $event)"
      />
    </div>
  </section>

  <section v-if="groupedMeasurements.centering.length" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Inputs</p>
        <h2 class="section-title">Centering</h2>
      </div>
    </div>

    <article class="field-card">
      <div class="panel-header">
        <div>
          <h3 class="field-title">Reserve-budget method</h3>
          <p class="supporting-copy">
            Solve the ISO runout limit first, then subtract only explicit TIR-equivalent reserve lines to resolve the
            allowable center tolerance.
          </p>
        </div>
        <span class="pill subtle-pill">Worst-case TIR budget</span>
      </div>

      <div class="summary-grid method-grid">
        <div>
          <p class="eyebrow">Sequence</p>
          <div class="summary-list">
            <div v-for="step in CENTER_TOLERANCE_METHOD_STEPS" :key="step" class="issue-card info">
              <p class="issue-text">{{ step }}</p>
            </div>
          </div>
        </div>

        <div>
          <p class="eyebrow">Defaults</p>
          <div class="summary-list">
            <div v-for="rule in CENTER_TOLERANCE_METHOD_DEFAULTS" :key="rule" class="issue-card warning">
              <p class="issue-text">{{ rule }}</p>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div class="card-grid">
      <MeasurementField
        v-for="definition in groupedMeasurements.centering"
        :key="definition.key"
        :definition="definition"
        :model-value="recordFor(definition.key)"
        :required="requiredKeys.has(definition.key)"
        :unit-system="store.project.unitSystem"
        @update:model-value="store.updateMeasurement(definition.key, $event)"
      />
    </div>
  </section>

  <section v-if="groupedMeasurements.interface.length" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Inputs</p>
        <h2 class="section-title">Fit</h2>
      </div>
    </div>

    <div class="card-grid">
      <MeasurementField
        v-for="definition in groupedMeasurements.interface"
        :key="definition.key"
        :definition="definition"
        :model-value="recordFor(definition.key)"
        :required="requiredKeys.has(definition.key)"
        :unit-system="store.project.unitSystem"
        :suggestable="definition.key === 'nominalShaftSize'"
        @suggest="store.suggestAndApplyNominal()"
        @update:model-value="store.updateMeasurement(definition.key, $event)"
      />
    </div>
  </section>

  <section v-if="groupedMeasurements.validation.length" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Inputs</p>
        <h2 class="section-title">Evidence</h2>
      </div>
    </div>

    <div class="card-grid">
      <MeasurementField
        v-for="definition in groupedMeasurements.validation"
        :key="definition.key"
        :definition="definition"
        :model-value="recordFor(definition.key)"
        :required="requiredKeys.has(definition.key)"
        :unit-system="store.project.unitSystem"
        @update:model-value="store.updateMeasurement(definition.key, $event)"
      />
    </div>
  </section>

  <div class="button-row">
    <RouterLink class="ghost-button" to="/">Back to home</RouterLink>
    <RouterLink class="action-button" to="/analysis/review">Open check</RouterLink>
  </div>
</template>
