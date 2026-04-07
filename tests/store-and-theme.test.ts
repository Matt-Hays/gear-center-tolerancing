import { fireEvent, render } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useTheme } from '@/composables/useTheme';
import { useAnalysisStore } from '@/stores/analysis';

describe('store and theme workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads the sample project into a standards-reviewed but release-blocked state', () => {
    const store = useAnalysisStore();
    store.loadSampleProject();

    expect(store.project.name).toBe('Rack Pinion Sample');
    expect(store.result.status).toBe('draft');
    expect(store.result.releaseGateStatus).toBe('blocked');
  });

  it('suggests and applies a nominal shaft size from the measured shaft', () => {
    const store = useAnalysisStore();
    store.updateMeasurement('shaftDiameterMeasured', {
      value: 1.0002,
      unit: 'in',
      method: 'Micrometer',
      instrument: '1-2 in micrometer'
    });
    store.updateMeasurement('nominalShaftSize', {
      value: undefined,
      unit: 'in'
    });

    store.suggestAndApplyNominal();

    const nominal = store.project.measurements.find((record) => record.key === 'nominalShaftSize');
    expect(nominal?.value).toBeCloseTo(1, 6);
  });

  it('persists the selected theme and updates the document state', async () => {
    const { getByRole } = render(ThemeToggle);
    const { preference } = useTheme();

    await fireEvent.click(getByRole('button', { name: 'Dark' }));

    expect(preference.value).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('gear-bore-tolerancing:theme')).toBe('dark');
  });
});
