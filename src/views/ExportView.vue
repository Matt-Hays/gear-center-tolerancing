<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { downloadTextFile } from '@/lib/io/projectFiles';
import { useAnalysisStore } from '@/stores/analysis';

const store = useAnalysisStore();

const exportReady = computed(() => store.project.measurements.some((record) => record.value !== undefined));

function exportProjectJson() {
  downloadTextFile(
    `${store.project.name.replace(/\s+/g, '-').toLowerCase() || 'gear-analysis'}.gbt.json`,
    JSON.stringify(store.exportProject(), null, 2),
    'application/json'
  );
}

async function exportWorkbook() {
  const { downloadWorkbook } = await import('@/lib/exports/xlsx');
  downloadWorkbook(store.project, store.result);
}

async function exportPdf() {
  const { downloadPdfReport } = await import('@/lib/exports/pdf');
  await downloadPdfReport(store.project, store.result);
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Export</p>
    <h2 class="hero-title">Package the job.</h2>
    <p class="hero-copy">
      Export a machinist-facing worksheet, the engineering appendix, and the local project file without exposing extra
      on-screen detail during review.
    </p>
  </section>

  <section class="summary-grid">
    <article class="panel">
      <p class="eyebrow">Outputs</p>
      <h2 class="section-title">Package</h2>
      <div class="card-grid">
        <div class="issue-card info">
          <h3>Machinist worksheet</h3>
          <p class="issue-text">Center-before-broach values, reserve-budget worksheet lines, and fit-critical dimensions.</p>
        </div>
        <div class="issue-card info">
          <h3>Engineering appendix</h3>
          <p class="issue-text">Trace, standards references, release checklist, equations, and open issues.</p>
        </div>
        <div class="issue-card info">
          <h3>Project file</h3>
          <p class="issue-text">Versioned local JSON document for reopening the exact analysis state.</p>
        </div>
      </div>
    </article>

    <article class="panel">
      <p class="eyebrow">Gate</p>
      <h2 class="section-title">{{ store.result.releaseGateStatus }}</h2>
      <p class="supporting-copy">
        {{ store.result.releaseGateStatus === 'readyForMachiningReview'
          ? 'The result is ready for machining review and the exports will reflect that.'
          : 'Draft or blocked exports are still allowed for review, but they are marked as not ready for machining review.' }}
      </p>

      <div class="export-actions">
        <button type="button" class="action-button" :disabled="!exportReady" @click="exportWorkbook">Download XLSX</button>
        <button type="button" class="ghost-button" :disabled="!exportReady" @click="exportPdf">Download PDF</button>
        <button type="button" class="ghost-button" @click="exportProjectJson">Save project file</button>
      </div>
    </article>
  </section>

  <section class="panel">
    <details class="details-block">
      <summary>What the export will flag</summary>
      <div class="details-content">
        <div v-if="store.result.issues.length" class="card-grid">
          <article v-for="issue in store.result.issues" :key="issue.code" class="issue-card" :class="issue.severity">
            <p class="eyebrow">{{ issue.severity }}</p>
            <h3>{{ issue.code }}</h3>
            <p class="issue-text">{{ issue.message }}</p>
          </article>
        </div>
        <p v-else class="supporting-copy">No issues are currently open for this export set.</p>
      </div>
    </details>
  </section>

  <div class="button-row">
    <RouterLink class="ghost-button" to="/analysis/recommendation">Back to result</RouterLink>
    <RouterLink class="action-button" to="/">Return home</RouterLink>
  </div>
</template>
