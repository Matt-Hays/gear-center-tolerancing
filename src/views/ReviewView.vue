<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatMeasurement, formatMeasurementRecord } from '@/lib/formatters';
import { useAnalysisStore } from '@/stores/analysis';
import type { ReleaseChecklistState } from '@/types/domain';

const store = useAnalysisStore();

const missing = computed(() =>
  store.result.missingMeasurements
    .map((key) => store.project.measurements.find((record) => record.key === key)?.label ?? key)
);

const geometryDerivedValues = computed(() => store.result.geometryResult?.derivedValues ?? []);

const manualChecklistKeys: Record<string, keyof ReleaseChecklistState> = {
  'standards-basis-confirmed': 'standardsBasisConfirmed',
  'standards-runout-method': 'standardsRunoutMethodConfirmed',
  'damaged-tooth-review': 'damagedToothReviewComplete',
  'center-tolerance-budget-confirmed': 'centerToleranceBudgetConfirmed',
  'independent-hand-check': 'independentHandCheckComplete'
};

function checklistKey(id: string) {
  return manualChecklistKeys[id];
}

function onChecklistToggle(id: string, event: Event) {
  const key = checklistKey(id);
  if (!key) {
    return;
  }

  store.updateReleaseChecklist(key, (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Check</p>
    <h2 class="hero-title">Check readiness.</h2>
    <p class="hero-copy">
      Confirm the release gate, close missing evidence, and complete the manual checks before using the result for a
      machining review.
    </p>
  </section>

  <section class="summary-grid">
    <article class="panel">
      <p class="eyebrow">Status</p>
      <h2 class="section-title">Gate</h2>
      <div class="metrics-grid">
        <div class="metric-tile">
          <p class="metric-label">Result</p>
          <p class="metric-value">{{ store.result.status }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Release gate</p>
          <p class="metric-value">{{ store.result.releaseGateStatus }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Missing items</p>
          <p class="metric-value">{{ missing.length }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Issues</p>
          <p class="metric-value">{{ store.result.issues.length }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">ISO flank tolerance class</p>
          <p class="metric-value">
            {{ store.project.iso1328FlankToleranceClass ? `Class ${store.project.iso1328FlankToleranceClass}` : 'Unset' }}
          </p>
        </div>
      </div>
    </article>

    <article class="panel">
      <p class="eyebrow">Release</p>
      <h2 class="section-title">Checklist</h2>
      <div class="summary-list">
        <div
          v-for="item in store.result.releaseChecklist"
          :key="item.id"
          class="checklist-item"
          :class="{ complete: item.complete }"
        >
          <label v-if="checklistKey(item.id)" class="checklist-row">
            <input type="checkbox" :checked="item.complete" @change="onChecklistToggle(item.id, $event)" />
            <span class="pill" :class="item.complete ? 'ready-pill' : 'subtle-pill'">
              {{ item.complete ? 'Complete' : 'Open' }}
            </span>
            <div class="checklist-copy">
              <strong class="checklist-title">{{ item.label }}</strong>
              <p v-if="item.note" class="issue-text">{{ item.note }}</p>
            </div>
          </label>
          <div v-else class="checklist-row">
            <span class="pill" :class="item.complete ? 'ready-pill' : 'subtle-pill'">
              {{ item.complete ? 'Complete' : 'Open' }}
            </span>
            <div class="checklist-copy">
              <strong class="checklist-title">{{ item.label }}</strong>
              <p v-if="item.note" class="issue-text">{{ item.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Issues</p>
        <h2 class="section-title">Open items</h2>
      </div>
    </div>

    <div v-if="missing.length" class="card-grid">
      <div v-for="label in missing" :key="label" class="issue-card error">
        <h3>{{ label }}</h3>
        <p class="issue-text">Required before the result can clear the release gate.</p>
      </div>
    </div>

    <div v-if="store.result.issues.length" class="card-grid">
      <article
        v-for="issue in store.result.issues"
        :key="issue.code"
        class="issue-card"
        :class="issue.severity"
      >
        <p class="eyebrow">{{ issue.severity }}</p>
        <h3>{{ issue.code }}</h3>
        <p class="issue-text">{{ issue.message }}</p>
      </article>
    </div>
    <p v-else-if="!missing.length" class="supporting-copy">
      No issues are open. The remaining gate items are shown in the checklist.
    </p>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Geometry</p>
        <h2 class="section-title">Snapshot</h2>
      </div>
    </div>

    <div class="metrics-grid">
      <div v-for="derived in geometryDerivedValues" :key="derived.key" class="metric-tile">
        <p class="metric-label">{{ derived.label }}</p>
        <p class="metric-value">{{ formatMeasurement(derived.value, derived.unit, store.project.unitSystem) }}</p>
      </div>
    </div>
  </section>

  <section class="panel">
    <details class="details-block">
      <summary>Evidence</summary>
      <div class="details-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>Measurement</th>
              <th>Value</th>
              <th>Method</th>
              <th>Instrument</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in store.project.measurements" :key="record.key">
              <td>{{ record.label }}</td>
              <td>{{ formatMeasurementRecord(record) }}</td>
              <td>{{ record.method || 'Not recorded' }}</td>
              <td>{{ record.instrument || 'Not recorded' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>

  <div class="button-row">
    <RouterLink class="ghost-button" to="/analysis/new">Back to inputs</RouterLink>
    <RouterLink class="action-button" to="/analysis/recommendation">Open result</RouterLink>
  </div>
</template>
