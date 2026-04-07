<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAnalysisStore } from '@/stores/analysis';

const store = useAnalysisStore();
const route = useRoute();

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Inputs', to: '/analysis/new' },
  { label: 'Check', to: '/analysis/review' },
  { label: 'Result', to: '/analysis/recommendation' },
  { label: 'Export', to: '/analysis/export' }
];

const statusClass = computed(() => ({
  blocked: store.result.status === 'blocked',
  draft: store.result.status === 'draft',
  ready: store.result.status === 'reviewReady'
}));

const releaseGateClass = computed(() => ({
  blocked: store.result.releaseGateStatus === 'blocked',
  draft: store.result.releaseGateStatus === 'pendingIndependentCheck',
  ready: store.result.releaseGateStatus === 'readyForMachiningReview'
}));

const resultStatusLabel = computed(() =>
  store.result.status === 'reviewReady' ? 'Review Ready' : store.result.status === 'draft' ? 'Draft' : 'Blocked'
);

const releaseGateLabel = computed(() =>
  store.result.releaseGateStatus === 'readyForMachiningReview'
    ? 'Ready for Machining Review'
    : store.result.releaseGateStatus === 'pendingIndependentCheck'
      ? 'Pending Hand Check'
      : 'Machining Blocked'
);

const pathwayLabel = computed(
  () => store.pathways.find((pathway) => pathway.id === store.project.selectedPathwayId)?.title ?? store.project.selectedPathwayId
);
</script>

<template>
  <div class="app-layout">
    <header class="topbar">
      <div class="topbar-brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">Rack-First Workflow</p>
          <h1>Gear Bore</h1>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="status-chip" :class="statusClass">
          {{ resultStatusLabel }}
        </div>
        <div class="status-chip" :class="releaseGateClass">{{ releaseGateLabel }}</div>
        <ThemeToggle />
      </div>
    </header>

    <div class="app-body">
      <aside class="sidebar panel sidebar-shell">
        <section class="sidebar-block">
          <p class="eyebrow">Navigate</p>
          <nav class="nav-list" aria-label="Primary">
            <RouterLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="nav-link"
              :class="{ active: route.path === item.to }"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </section>

        <div class="sidebar-summary">
          <section class="sidebar-block">
            <p class="eyebrow">Current Job</p>
            <h2 class="section-title compact">{{ store.project.name }}</h2>
            <p class="supporting-copy sidebar-note">
              {{ store.project.gearFamily === 'rackPinion'
                ? 'Rack and pinion is the primary field path for this release.'
                : 'Spur and helical remain available as secondary, review-gated workflows.' }}
            </p>
          </section>

          <section class="sidebar-block">
            <p class="eyebrow">Job At A Glance</p>
            <dl class="summary-list sidebar-definition-list">
              <div>
                <dt>Gear family</dt>
                <dd>{{ store.project.gearFamily }}</dd>
              </div>
              <div>
                <dt>Interface</dt>
                <dd>{{ store.project.shaftInterface }}</dd>
              </div>
              <div>
                <dt>Pathway</dt>
                <dd>{{ pathwayLabel }}</dd>
              </div>
              <div>
                <dt>ISO flank class</dt>
                <dd>
                  {{ store.project.iso1328FlankToleranceClass ? `Class ${store.project.iso1328FlankToleranceClass}` : 'Select class' }}
                </dd>
              </div>
              <div>
                <dt>Basis</dt>
                <dd>{{ store.project.centerToleranceStandard }}</dd>
              </div>
              <div>
                <dt>Release gate</dt>
                <dd>{{ releaseGateLabel }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>

      <main class="page-shell">
        <RouterView />
      </main>
    </div>
  </div>
</template>
