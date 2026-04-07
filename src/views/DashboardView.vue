<script setup lang="ts">
import { inject, ref } from 'vue';
import { RouterLink, routerKey } from 'vue-router';
import { useAnalysisStore } from '@/stores/analysis';

const store = useAnalysisStore();
const router = inject(routerKey, null);
const fileInput = ref<HTMLInputElement | null>(null);

async function importProject(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  const file = files?.[0];
  if (!file) {
    return;
  }

  const raw = await file.text();
  store.importProject(raw);
  void router?.push('/analysis/review');
}

function openImportPicker() {
  fileInput.value?.click();
}

function startFresh() {
  store.resetProject();
  void router?.push('/analysis/new');
}

function loadSample() {
  store.loadSampleProject();
  void router?.push('/analysis/recommendation');
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Home</p>
    <h2 class="hero-title">Rack-first bore review.</h2>
    <p class="hero-copy">
      Use the center-before-broach path to capture rack pitch, centering evidence, and release checks before an
      aftermarket pinion is broached.
    </p>
  </section>

  <section class="summary-grid">
    <article class="panel">
      <p class="eyebrow">Primary</p>
      <h2 class="section-title">Rack &amp; pinion</h2>
      <p class="supporting-copy">
        Start the rack-centering workflow for field use. Spur and helical remain available under Inputs when you need
        them.
      </p>

      <div class="button-row">
        <button type="button" class="action-button" @click="startFresh">Start rack job</button>
        <RouterLink class="ghost-button" to="/analysis/new">Open inputs</RouterLink>
        <button type="button" class="ghost-button" @click="loadSample">Load sample</button>
        <button type="button" class="ghost-button" @click="openImportPicker">Open file</button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept=".json,.gbt.json,application/json"
          @change="importProject"
        />
      </div>
    </article>

    <article class="panel">
      <p class="eyebrow">Current</p>
      <h2 class="section-title">{{ store.project.name }}</h2>
      <p class="supporting-copy">
        {{ store.project.notes || 'No notes yet. Inputs, checks, and exports stay in one local project file.' }}
      </p>

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
          <p class="metric-label">Issues</p>
          <p class="metric-value">{{ store.result.issues.length }}</p>
        </div>
      </div>

      <div class="button-row">
        <RouterLink class="action-button" to="/analysis/review">Open check</RouterLink>
        <RouterLink class="ghost-button" to="/analysis/recommendation">Open result</RouterLink>
      </div>
    </article>
  </section>

  <section class="summary-grid">
    <article class="panel">
      <p class="eyebrow">Other gear types</p>
      <h2 class="section-title">Spur and helical</h2>
      <p class="supporting-copy">
        These workflows remain available, but this release is tuned for the rack-and-pinion centering job.
      </p>
      <RouterLink class="ghost-button" to="/analysis/new">Choose another gear type</RouterLink>
    </article>

    <article class="panel">
      <p class="eyebrow">Standards</p>
      <h2 class="section-title">{{ store.result.standardsProfile.basisLabel }}</h2>
      <p class="supporting-copy">{{ store.result.standardsProfile.releaseNote }}</p>

      <details class="details-block">
        <summary>Show reference pack</summary>
        <div class="details-content">
          <p class="supporting-copy">{{ store.result.standardsProfile.summary }}</p>
          <div class="card-grid reference-grid">
            <div v-for="reference in store.result.standardsProfile.references" :key="reference.code" class="issue-card info">
              <h3>{{ reference.code }}</h3>
              <p class="issue-text">{{ reference.title }}</p>
              <a class="ghost-button" :href="reference.url" target="_blank" rel="noreferrer">Open reference</a>
            </div>
          </div>
        </div>
      </details>
    </article>
  </section>
</template>
