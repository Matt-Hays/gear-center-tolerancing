<script setup lang="ts">
import { ref } from 'vue';
import { formatMeasurement } from '@/lib/formatters';
import type { CalculationTrace, UnitSystem } from '@/types/domain';

const open = ref(false);

defineProps<{
  trace: CalculationTrace;
  unitSystem: UnitSystem;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Trace</p>
        <h2 class="section-title">Engineering trace</h2>
      </div>
      <div class="button-row">
        <p class="meta-text">Generated {{ new Date(trace.generatedAt).toLocaleString() }}</p>
        <button type="button" class="ghost-button" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
          {{ open ? 'Hide trace' : 'Show trace' }}
        </button>
      </div>
    </div>

    <div v-if="open" class="trace-list">
      <article v-for="step in trace.steps" :key="step.id" class="trace-card">
        <div class="trace-heading">
          <div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.detail }}</p>
          </div>
          <span class="pill subtle-pill">{{ step.reference }}</span>
        </div>

        <p v-if="step.equation" class="formula-text">{{ step.equation }}</p>
        <p class="meta-text">Equation ID: {{ step.equationId }} | Branch: {{ step.branchId }}</p>

        <dl class="trace-grid">
          <div v-for="output in step.outputs" :key="output.key" class="trace-output">
            <dt>{{ output.label }}</dt>
            <dd>{{ formatMeasurement(output.value, output.unit, unitSystem) }}</dd>
            <p class="meta-text">
              {{ output.equationId }} | Sources: {{ output.sourceMeasurementKeys.join(', ') }} | {{ output.roundingRule }}
            </p>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>
