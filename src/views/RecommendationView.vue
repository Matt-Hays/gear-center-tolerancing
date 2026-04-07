<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import TracePanel from '@/components/TracePanel.vue';
import { formatLengthMm, formatMeasurementRecord } from '@/lib/formatters';
import {
  CENTER_TOLERANCE_METHOD_DEFAULTS,
  CENTER_TOLERANCE_METHOD_STEPS,
  CENTER_TOLERANCE_RESERVE_KEYS
} from '@/lib/guides/centerToleranceBudget';
import { useAnalysisStore } from '@/stores/analysis';

const store = useAnalysisStore();

const reserveBudgetRecords = computed(() =>
  store.project.measurements.filter((record) => CENTER_TOLERANCE_RESERVE_KEYS.includes(record.key))
);
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Result</p>
    <h2 class="hero-title">Review the result.</h2>
    <p class="hero-copy">
      The app can solve the fit and build the centering packet, but machining review still stays behind the release
      gate.
    </p>
  </section>

  <section class="summary-grid">
    <article class="panel">
      <p class="eyebrow">Fit</p>
      <h2 class="section-title">{{ store.result.recommendation?.headline || 'Result unavailable' }}</h2>
      <p class="supporting-copy">
        {{ store.result.recommendation?.fitIntent || 'Complete the blocked fields to generate a recommendation.' }}
      </p>

      <div v-if="store.result.recommendation" class="metrics-grid">
        <div class="metric-tile">
          <p class="metric-label">Fit code</p>
          <p class="metric-value">{{ store.result.recommendation.fitCode }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Bore minimum</p>
          <p class="metric-value">
            {{ formatLengthMm(store.result.recommendation.recommendedBoreMinMm ?? 0, store.project.unitSystem) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Bore maximum</p>
          <p class="metric-value">
            {{ formatLengthMm(store.result.recommendation.recommendedBoreMaxMm ?? 0, store.project.unitSystem) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">
            {{ store.project.shaftInterface === 'keyed' ? 'Clearance band' : 'Interference band' }}
          </p>
          <p class="metric-value">
            {{ formatLengthMm(store.result.recommendation.expectedInterfaceMinMm ?? 0, store.project.unitSystem) }}
            to
            {{ formatLengthMm(store.result.recommendation.expectedInterfaceMaxMm ?? 0, store.project.unitSystem) }}
          </p>
        </div>
      </div>

      <div v-if="store.result.recommendation?.keyWidth !== undefined" class="metrics-grid">
        <div class="metric-tile">
          <p class="metric-label">Key width</p>
          <p class="metric-value">{{ formatLengthMm(store.result.recommendation.keyWidth, store.project.unitSystem) }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Key height</p>
          <p class="metric-value">
            {{ formatLengthMm(store.result.recommendation.keyHeight ?? 0, store.project.unitSystem) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">Hub keyway depth</p>
          <p class="metric-value">
            {{ formatLengthMm(store.result.recommendation.keywayHubDepth ?? 0, store.project.unitSystem) }}
          </p>
        </div>
      </div>
    </article>

    <article class="panel">
      <p class="eyebrow">Gate</p>
      <h2 class="section-title">{{ store.result.releaseGateStatus }}</h2>
      <p class="supporting-copy">
        {{ store.result.releaseGateStatus === 'readyForMachiningReview'
          ? 'The calculation and manual checks are complete for machining review.'
          : store.result.releaseGateStatus === 'pendingIndependentCheck'
            ? 'The result is solved, but the independent hand-check is still required.'
            : 'Open issues or missing evidence still block machining review.' }}
      </p>

      <div class="summary-list">
        <div
          v-for="item in store.result.releaseChecklist"
          :key="item.id"
          class="issue-card"
          :class="item.complete ? 'info' : 'warning'"
        >
          <h3>{{ item.label }}</h3>
          <p class="issue-text">{{ item.complete ? 'Complete.' : item.note || 'Still open.' }}</p>
        </div>
      </div>
    </article>
  </section>

  <section v-if="store.result.centeringResult" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Centering</p>
        <h2 class="section-title">{{ store.result.centeringResult.headline }}</h2>
      </div>
    </div>

    <div v-if="store.result.centeringResult.releaseBlockReasons.length" class="issue-card warning">
      <h3>Centering release blockers remain open</h3>
      <p class="issue-text">{{ store.result.centeringResult.releaseBlockReasons[0] }}</p>
    </div>

    <p class="supporting-copy">{{ store.result.centeringResult.governingGeometryBasis }}</p>

    <div class="summary-grid">
      <article class="field-card">
        <p class="eyebrow">Critical outputs</p>
        <div class="metrics-grid">
          <div class="metric-tile">
            <p class="metric-label">{{ store.result.centeringResult.standardsQuantityName }}</p>
            <p class="metric-value">
              {{ store.result.centeringResult.allowableRunoutFrTDisplay }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Allowable center tolerance (TIR)</p>
            <p class="metric-value">
              {{ store.result.centeringResult.allowableCenterToleranceDisplay ?? 'Pending reserve budget' }}
            </p>
          </div>
          <div v-if="store.result.centeringResult.reserveBudgetTotalTirMm !== undefined" class="metric-tile">
            <p class="metric-label">Reserve budget total</p>
            <p class="metric-value">
              {{ formatLengthMm(store.result.centeringResult.reserveBudgetTotalTirMm, store.project.unitSystem) }}
            </p>
          </div>
          <div v-if="store.result.centeringResult.equivalentRadialOffsetMm !== undefined" class="metric-tile">
            <p class="metric-label">Equivalent radial center offset</p>
            <p class="metric-value">
              {{ formatLengthMm(store.result.centeringResult.equivalentRadialOffsetMm, store.project.unitSystem) }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Standards acceptance</p>
            <p class="metric-value">
              {{ store.result.centeringResult.standardsAcceptancePass ? 'Pass' : 'Blocked' }}
            </p>
          </div>
        </div>
      </article>

      <article class="field-card">
        <p class="eyebrow">Standards context</p>
        <div class="metrics-grid">
          <div class="metric-tile">
            <p class="metric-label">Standards basis</p>
            <p class="metric-value">{{ store.result.centeringResult.standardsBasisLabel }}</p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Basis status</p>
            <p class="metric-value">
              {{ store.result.centeringResult.standardsValidationStatus }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Pitch diameter</p>
            <p class="metric-value">
              {{ formatLengthMm(store.result.centeringResult.pitchDiameterMm, store.project.unitSystem) }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">ISO flank tolerance class</p>
            <p class="metric-value">Class {{ store.result.centeringResult.iso1328FlankToleranceClass }}</p>
          </div>
          <div v-if="store.result.centeringResult.centerHeightFromRackPitchLineMm !== undefined" class="metric-tile">
            <p class="metric-label">Center height</p>
            <p class="metric-value">
              {{ formatLengthMm(store.result.centeringResult.centerHeightFromRackPitchLineMm, store.project.unitSystem) }}
            </p>
          </div>
          <div v-if="store.result.centeringResult.rackLinearPitchMm !== undefined" class="metric-tile">
            <p class="metric-label">Rack linear pitch</p>
            <p class="metric-value">
              {{ formatLengthMm(store.result.centeringResult.rackLinearPitchMm, store.project.unitSystem) }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Recorded runout Fr</p>
            <p class="metric-value">
              {{ store.result.centeringResult.recordedRunoutFrMm !== undefined
                ? formatLengthMm(store.result.centeringResult.recordedRunoutFrMm, store.project.unitSystem)
                : 'Not recorded' }}
            </p>
          </div>
        </div>
      </article>

      <article class="field-card">
        <p class="eyebrow">Release evidence</p>
        <div class="metrics-grid">
          <div class="metric-tile">
            <p class="metric-label">Setup evidence</p>
            <p class="metric-value">
              {{ store.result.centeringResult.setupEvidenceComplete ? 'Complete' : 'Incomplete' }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Reserve budget</p>
            <p class="metric-value">
              {{ store.result.centeringResult.centerToleranceBudgetComplete ? 'Complete' : 'Incomplete' }}
            </p>
          </div>
          <div class="metric-tile">
            <p class="metric-label">Budget confirmed</p>
            <p class="metric-value">
              {{ store.result.centeringResult.centerToleranceBudgetConfirmed ? 'Yes' : 'No' }}
            </p>
          </div>
        </div>
      </article>
    </div>

    <div class="summary-grid">
      <article class="field-card">
        <h3 class="field-title">Bore center basis</h3>
        <p class="supporting-copy">{{ store.result.centeringResult.boreCenterBasis }}</p>
        <p class="meta-text">{{ store.result.centeringResult.toleranceBasisReference }}</p>
        <p class="meta-text">{{ store.result.centeringResult.acceptanceModeNote }}</p>
        <p class="meta-text">Validation artifact: {{ store.result.centeringResult.standardsValidationArtifactPath }}</p>
      </article>

      <article class="field-card">
        <h3 class="field-title">Checks</h3>
        <div class="summary-list">
          <div v-for="check in store.result.centeringResult.inspectionChecks" :key="check" class="issue-card info">
            <p class="issue-text">{{ check }}</p>
          </div>
        </div>
      </article>
    </div>

    <div class="summary-grid">
      <article class="field-card">
        <h3 class="field-title">Reserve-budget worksheet</h3>
        <div class="card-grid reserve-card-grid">
          <div v-for="record in reserveBudgetRecords" :key="record.key" class="issue-card info">
            <strong>{{ record.label }}</strong>
            <p class="issue-text">Value: {{ formatMeasurementRecord(record) }}</p>
            <p class="issue-text">Method: {{ record.method || 'Not recorded' }}</p>
            <p class="issue-text">Notes: {{ record.notes || 'Not recorded' }}</p>
          </div>
        </div>
      </article>

      <article class="field-card">
        <div class="panel-header">
          <div>
            <h3 class="field-title">Center-tolerance method</h3>
            <p class="supporting-copy">Use the standards quantity as the ceiling, then subtract only documented reserve lines.</p>
          </div>
          <span class="pill subtle-pill">Explicit reserve lines only</span>
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
    </div>

    <article v-if="store.result.centeringResult.releaseBlockReasons.length" class="field-card">
      <h3 class="field-title">Release blockers</h3>
      <div class="summary-list">
        <div v-for="reason in store.result.centeringResult.releaseBlockReasons" :key="reason" class="issue-card warning">
          <p class="issue-text">{{ reason }}</p>
        </div>
      </div>
    </article>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Notes</p>
        <h2 class="section-title">Review</h2>
      </div>
    </div>

    <div v-if="store.result.recommendation?.notes.length || store.result.centeringResult?.machiningNotes.length" class="card-grid">
      <div
        v-for="note in [...(store.result.recommendation?.notes ?? []), ...(store.result.centeringResult?.machiningNotes ?? [])]"
        :key="note"
        class="issue-card info"
      >
        <p class="issue-text">{{ note }}</p>
      </div>
    </div>
    <p v-else class="supporting-copy">No review cues are available yet.</p>
  </section>

  <section v-if="store.result.issues.length" class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Issues</p>
        <h2 class="section-title">Open items</h2>
      </div>
    </div>

    <div class="card-grid">
      <article v-for="issue in store.result.issues" :key="issue.code" class="issue-card" :class="issue.severity">
        <p class="eyebrow">{{ issue.severity }}</p>
        <h3>{{ issue.code }}</h3>
        <p class="issue-text">{{ issue.message }}</p>
      </article>
    </div>
  </section>

  <TracePanel :trace="store.result.trace" :unit-system="store.project.unitSystem" />

  <div class="button-row">
    <RouterLink class="ghost-button" to="/analysis/review">Back to check</RouterLink>
    <RouterLink class="action-button" to="/analysis/export">Open export</RouterLink>
  </div>
</template>
