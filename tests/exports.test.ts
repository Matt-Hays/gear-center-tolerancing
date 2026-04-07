import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { analyzeProject } from '@/lib/calculations/engine';
import { createPdfReport } from '@/lib/exports/pdf';
import { createWorkbook } from '@/lib/exports/xlsx';
import { cloneProject, getBenchmarkCase } from './benchmarks/cases';

describe('exports', () => {
  it('creates the required workbook sheets with reserve-budget center tolerance metadata', () => {
    const benchmark = getBenchmarkCase('rack-pinion-rack-centering-keyed-imperial');
    const project = cloneProject(benchmark.project);
    const result = analyzeProject(project);
    const workbook = createWorkbook(project, result);

    expect(workbook.SheetNames).toEqual([
      'Project',
      'Measurements',
      'Derived Geometry',
      'Machinist Worksheet',
      'Engineering Appendix',
      'Standards Snapshot',
      'Trace',
      'Recommendation'
    ]);

    const traceRows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets['Trace'], { header: 1 });
    const worksheetRows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets['Machinist Worksheet'], {
      header: 1
    });
    const appendixRows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets['Engineering Appendix'], {
      header: 1
    });

    const isoClassRow = worksheetRows.find((row) => String(row[0]).includes('ISO flank tolerance class'));
    const centerToleranceRow = worksheetRows.find((row) =>
      String(row[0]).includes('Allowable center tolerance (TIR) mm')
    );
    const reserveBudgetRow = worksheetRows.find((row) => String(row[0]).includes('Reserve budget total TIR mm'));
    const validationArtifactRow = appendixRows.find((row) => String(row[0]).includes('Validation artifact'));
    const releaseChecklistRow = appendixRows.find((row) => String(row[0]).includes('Release checklist'));
    const basisStatusRow = worksheetRows.find((row) => String(row[0]).includes('Basis status'));

    expect(String(traceRows[1][5])).toContain('INPUT-NORMALIZE');
    expect(String(worksheetRows[0][1])).toContain('Center before broach');
    expect(String(worksheetRows[6][0])).toContain('Standards quantity');
    expect(isoClassRow?.[0]).toContain('ISO flank tolerance class');
    expect(String(isoClassRow?.[1])).toContain('Class 8');
    expect(Number(centerToleranceRow?.[1])).toBeCloseTo(0.03, 6);
    expect(Number(reserveBudgetRow?.[1])).toBeCloseTo(0.018, 6);
    expect(String(basisStatusRow?.[1])).toContain('provisional');
    expect(String(appendixRows[0][1])).toContain('Published Reference Pack');
    expect(validationArtifactRow?.[0]).toContain('Validation artifact');
    expect(releaseChecklistRow?.[0]).toContain('Release checklist');
  });

  it('creates a multi-page PDF report with ISO release-review content', () => {
    const benchmark = getBenchmarkCase('helical-direct-pitch-interference-metric');
    const project = cloneProject(benchmark.project);
    const result = analyzeProject(project);
    const pdf = createPdfReport(project, result);
    const binary = pdf.output('arraybuffer');

    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    expect(binary.byteLength).toBeGreaterThan(1500);
  });
});
