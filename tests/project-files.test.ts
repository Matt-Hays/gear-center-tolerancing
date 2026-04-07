import { describe, expect, it } from 'vitest';
import { parseProjectFile, serializeProject } from '@/lib/io/projectFiles';
import { cloneProject, getBenchmarkCase } from './benchmarks/cases';

describe('project file migration', () => {
  it('loads legacy AGMA-Q project files into the ISO workflow in a blocked audit state', () => {
    const project = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    const legacyProject = {
      ...project,
      agmaQualityGrade: 10,
      measurements: project.measurements.map((record) =>
        record.key === 'runoutFrMeasured' ? { ...record, key: 'toothRunoutMeasured', label: 'Tooth datum runout' } : record
      )
    };

    delete (legacyProject as { iso1328FlankToleranceClass?: unknown }).iso1328FlankToleranceClass;

    const migrated = parseProjectFile(
      JSON.stringify({
        schemaVersion: 'ProjectFileV1',
        exportedAt: '2026-04-05T16:00:00.000Z',
        project: legacyProject
      })
    );

    expect(migrated.centerToleranceStandard).toBe('iso1328Part1Runout');
    expect(migrated.iso1328FlankToleranceClass).toBeUndefined();
    expect(migrated.legacyCenteringAudit?.legacyAgmaQQualityNumber).toBe(10);
    expect(migrated.legacyCenteringAudit?.migratedRunoutFrFromToothDatum).toBe(true);
    expect(migrated.legacyCenteringAudit?.requiresStandardsRevalidation).toBe(true);
    expect(migrated.releaseChecklistState.centerToleranceBudgetConfirmed).toBe(false);
    expect(migrated.measurements.some((record) => record.key === 'runoutFrMeasured')).toBe(true);
    expect(migrated.measurements.some((record) => record.key === 'toothRunoutMeasured')).toBe(false);
  });

  it('serializes the current ISO field names for newly exported projects', () => {
    const project = cloneProject(getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial').project);
    const serialized = serializeProject(project);

    expect(serialized.project).toHaveProperty('iso1328FlankToleranceClass', project.iso1328FlankToleranceClass);
    expect(serialized.project).toHaveProperty('centerToleranceStandard', 'iso1328Part1Runout');
    expect(serialized.project).toHaveProperty(
      'releaseChecklistState.centerToleranceBudgetConfirmed',
      project.releaseChecklistState.centerToleranceBudgetConfirmed
    );
    expect(serialized.project).not.toHaveProperty('agmaQualityGrade');
    expect(serialized.project).not.toHaveProperty('agmaQQualityNumber');
  });
});
