import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import NewAnalysisView from '@/views/NewAnalysisView.vue';
import RecommendationView from '@/views/RecommendationView.vue';
import { serializeProject } from '@/lib/io/projectFiles';
import { cloneProject, getBenchmarkCase } from './benchmarks/cases';
import { useAnalysisStore } from '@/stores/analysis';

const visualAuditCases = [
  {
    id: 'inputs-stress-light',
    component: NewAnalysisView,
    title: 'Capture the job.',
    theme: 'light',
    watchedSelectors: ['.measurement-card', '.field-description', '.issue-card', '.details-block', '.section-title']
  },
  {
    id: 'inputs-stress-dark',
    component: NewAnalysisView,
    title: 'Capture the job.',
    theme: 'dark',
    watchedSelectors: ['.measurement-card', '.field-description', '.issue-card', '.details-block', '.section-title']
  },
  {
    id: 'result-stress-light',
    component: RecommendationView,
    title: 'Review the result.',
    theme: 'light',
    watchedSelectors: ['.metric-value', '.issue-text', '.formula-text', '.pill', '.section-title']
  },
  {
    id: 'result-stress-dark',
    component: RecommendationView,
    title: 'Review the result.',
    theme: 'dark',
    watchedSelectors: ['.metric-value', '.issue-text', '.formula-text', '.pill', '.section-title']
  }
];

function loadStressProject() {
  const project = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
  project.name =
    'Rack-and-pinion center-before-broach validation job for damaged transformer travel-switch replacement gear set';
  project.notes =
    'Long-form review note used to validate wrapping and card alignment when standards references, checklist content, and engineering instructions are all populated at the same time.';
  project.measurements = project.measurements.map((record) =>
    record.key === 'nominalShaftSize'
      ? {
          ...record,
          method:
            'Confirmed from approved transformer maintenance drawing and in-house hand calculation cross-check after damaged-tooth review',
          instrument: 'Engineering release packet and calibrated metrology record'
        }
      : record
  );
  return project;
}

describe('ui audit guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps the shared overflow guards in the stylesheet for the main text containers', () => {
    const stylesheet = readFileSync(resolve('src/style.css'), 'utf8');

    expect(stylesheet).toContain('.metric-value');
    expect(stylesheet).toContain('overflow-wrap: anywhere;');
    expect(stylesheet).toContain('.formula-text');
    expect(stylesheet).toContain('word-break: break-word;');
    expect(stylesheet).toContain('.panel-header > *');
    expect(stylesheet).toContain('min-width: 0;');
    expect(stylesheet).toContain('--text-body');
    expect(stylesheet).toContain('.sidebar-block');
    expect(stylesheet).toContain('align-items: start;');
  });

  it.each(visualAuditCases)('renders the stress case for $id without dropping the guarded containers', (auditCase) => {
    const store = useAnalysisStore();
    store.importProject(JSON.stringify(serializeProject(loadStressProject())));
    document.documentElement.dataset.theme = auditCase.theme;

    const { container, getByText } = render(auditCase.component, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    });

    expect(getByText(auditCase.title)).toBeTruthy();
    expect(container.querySelectorAll(auditCase.watchedSelectors.join(', ')).length).toBeGreaterThan(0);
  });
});
