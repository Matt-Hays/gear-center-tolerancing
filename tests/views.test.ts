import { render } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import DashboardView from '@/views/DashboardView.vue';
import NewAnalysisView from '@/views/NewAnalysisView.vue';
import RecommendationView from '@/views/RecommendationView.vue';
import ReviewView from '@/views/ReviewView.vue';
import { serializeProject } from '@/lib/io/projectFiles';
import { router } from '@/router';
import { cloneProject, getBenchmarkCase } from './benchmarks/cases';
import { useAnalysisStore } from '@/stores/analysis';

function loadBenchmark(store: ReturnType<typeof useAnalysisStore>, caseId: string) {
  store.importProject(JSON.stringify(serializeProject(cloneProject(getBenchmarkCase(caseId).project))));
}

describe('workflow views', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults the home and inputs flow to the rack-first workflow', () => {
    const store = useAnalysisStore();

    const dashboard = render(DashboardView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(dashboard.getByText('Rack-first bore review.')).toBeTruthy();
    expect(dashboard.getByText('Rack & pinion')).toBeTruthy();

    dashboard.unmount();

    const inputs = render(NewAnalysisView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(store.project.gearFamily).toBe('rackPinion');
    expect(store.project.selectedPathwayId).toBe('rack-centering');
    expect(inputs.getByText('Capture the job.')).toBeTruthy();
    expect(inputs.getByText('Center before broach')).toBeTruthy();
    expect(inputs.getAllByText('ISO flank tolerance class').length).toBeGreaterThan(0);
    expect(inputs.getByText('Reserve-budget method')).toBeTruthy();
  });

  it('shows pathway-specific fields for helical and rack-centering workflows', () => {
    const store = useAnalysisStore();
    loadBenchmark(store, 'helical-direct-pitch-keyed-metric');

    const helicalView = render(NewAnalysisView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(helicalView.getByText('Helix angle')).toBeTruthy();
    expect(helicalView.getByText('Known transverse module')).toBeTruthy();

    helicalView.unmount();
    loadBenchmark(store, 'rack-pinion-rack-centering-keyed-metric');

    const rackView = render(NewAnalysisView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(rackView.getByText('Rack linear pitch')).toBeTruthy();
    expect(rackView.getByText('Measured runout Fr')).toBeTruthy();
    expect(rackView.getByText('Mounting face runout')).toBeTruthy();
  });

  it('renders rack and pinion canonical review values without runaway unit conversion', () => {
    const store = useAnalysisStore();
    loadBenchmark(store, 'rack-pinion-direct-pitch-keyed-imperial');

    const { getAllByText, getByText, queryByText } = render(ReviewView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(getByText('Check readiness.')).toBeTruthy();
    expect(getByText('Pinion pitch diameter')).toBeTruthy();
    expect(getAllByText('2.5 in').length).toBeGreaterThan(0);
    expect(getAllByText('Rack linear pitch').length).toBeGreaterThan(0);
    expect(getAllByText('0.3927 in').length).toBeGreaterThan(0);
    expect(queryByText('3,091.3272 in')).toBeNull();
  });

  it('hides the engineering trace by default and shows standards trace metadata in the result view', () => {
    const store = useAnalysisStore();
    loadBenchmark(store, 'rack-pinion-rack-centering-keyed-imperial');

    const { getAllByText, getByText, queryByText } = render(RecommendationView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(getByText('Review the result.')).toBeTruthy();
    expect(getByText('Center before broach')).toBeTruthy();
    expect(getByText('Allowable center tolerance (TIR)')).toBeTruthy();
    expect(getByText('Allowable ISO runout FrT')).toBeTruthy();
    expect(getByText('provisional')).toBeTruthy();
    expect(getByText('Reserve-budget worksheet')).toBeTruthy();
    expect(getByText('Validation artifact: docs/validation/iso1328-runout-validation.md')).toBeTruthy();
    expect(getAllByText(/not a direct ISO output/i).length).toBeGreaterThan(0);
    expect(getByText('Show trace')).toBeTruthy();
    expect(queryByText('Normalize measurements')).toBeNull();
  });

  it('shows blocked messaging when rack-centering evidence is incomplete', () => {
    const store = useAnalysisStore();
    loadBenchmark(store, 'rack-pinion-rack-centering-keyed-imperial-missing-evidence');

    const { getAllByText } = render(ReviewView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(getAllByText('Measured runout Fr').length).toBeGreaterThan(0);
    expect(getAllByText('Mounting face runout').length).toBeGreaterThan(0);
    expect(getAllByText('Required before the result can clear the release gate.').length).toBeGreaterThan(0);
  });

  it('resolves the dashboard route under the configured Vite base path', () => {
    expect(router.resolve({ name: 'dashboard' }).href).toBe(import.meta.env.BASE_URL);
  });
});
