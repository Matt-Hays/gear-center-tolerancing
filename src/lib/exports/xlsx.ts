import * as XLSX from 'xlsx';
import {
  CENTER_TOLERANCE_METHOD_DEFAULTS,
  CENTER_TOLERANCE_METHOD_STEPS,
  CENTER_TOLERANCE_RESERVE_KEYS
} from '@/lib/guides/centerToleranceBudget';
import type { AnalysisProject, AnalysisResult } from '@/types/domain';

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: (string | number | undefined)[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function machinistWorksheetRows(project: AnalysisProject, result: AnalysisResult) {
  const rows: (string | number | undefined)[][] = [
    ['Worksheet', result.centeringResult?.headline ?? 'Bore fit worksheet'],
    ['Project name', project.name],
    ['Release gate', result.releaseGateStatus],
    ['Result status', result.status],
    ['Ready for machining review', result.releaseGateStatus === 'readyForMachiningReview' ? 'Yes' : 'No'],
    []
  ];

  if (result.centeringResult) {
    rows.push(
      ['Standards quantity', result.centeringResult.standardsQuantityName],
      ['Allowable runout FrT um', result.centeringResult.allowableRunoutFrTUm],
      ['Standards basis', result.centeringResult.standardsBasisLabel],
      ['Basis status', result.centeringResult.standardsValidationStatus],
      ['Allowable center tolerance (TIR) mm', result.centeringResult.allowableCenterToleranceTirMm],
      ['Reserve budget total TIR mm', result.centeringResult.reserveBudgetTotalTirMm],
      ['Equivalent radial center offset mm', result.centeringResult.equivalentRadialOffsetMm],
      ['ISO flank tolerance class', `Class ${result.centeringResult.iso1328FlankToleranceClass}`],
      ['Reference diameter mm', result.centeringResult.referenceDiameterMm],
      ['Normal module mm', result.centeringResult.normalModuleMm],
      ['Pitch diameter mm', result.centeringResult.pitchDiameterMm],
      ['Outside diameter mm', result.centeringResult.outsideDiameterMm],
      ['Center height from rack pitch line mm', result.centeringResult.centerHeightFromRackPitchLineMm],
      ['Rack linear pitch mm', result.centeringResult.rackLinearPitchMm],
      ['Recorded runout Fr mm', result.centeringResult.recordedRunoutFrMm],
      ['Recorded mounting face runout mm', result.centeringResult.recordedMountingFaceRunoutMm],
      ['Standards acceptance pass', result.centeringResult.standardsAcceptancePass ? 'Yes' : 'No'],
      ['Setup evidence complete', result.centeringResult.setupEvidenceComplete ? 'Yes' : 'No'],
      ['Runout method confirmed', result.centeringResult.standardsRunoutMethodConfirmed ? 'Yes' : 'No'],
      ['Reserve budget complete', result.centeringResult.centerToleranceBudgetComplete ? 'Yes' : 'No'],
      ['Reserve budget confirmed', result.centeringResult.centerToleranceBudgetConfirmed ? 'Yes' : 'No'],
      []
    );

    rows.push(['Reserve budget lines'], ['Label', 'Value', 'Unit', 'Method', 'Notes']);
    rows.push(
      ...project.measurements
        .filter((record) => CENTER_TOLERANCE_RESERVE_KEYS.includes(record.key))
        .map((record) => [record.label, record.value, record.unit, record.method, record.notes])
    );
    rows.push([], ['Center-tolerance method']);
    rows.push(...CENTER_TOLERANCE_METHOD_STEPS.map((step) => [step]));
    rows.push([], ['Center-tolerance rules']);
    rows.push(...CENTER_TOLERANCE_METHOD_DEFAULTS.map((rule) => [rule]));
  }

  rows.push(
    ['Fit code', result.recommendation?.fitCode],
    ['Nominal size mm', result.recommendation?.nominalSizeMm],
    ['Recommended bore min mm', result.recommendation?.recommendedBoreMinMm],
    ['Recommended bore max mm', result.recommendation?.recommendedBoreMaxMm],
    ['Expected interface min mm', result.recommendation?.expectedInterfaceMinMm],
    ['Expected interface max mm', result.recommendation?.expectedInterfaceMaxMm],
    ['Key width mm', result.recommendation?.keyWidth],
    ['Key height mm', result.recommendation?.keyHeight],
    ['Hub keyway depth mm', result.recommendation?.keywayHubDepth],
    []
  );

  if (result.centeringResult) {
    rows.push(['Inspection checks']);
    rows.push(...result.centeringResult.inspectionChecks.map((check) => [check]));
  }

  return rows;
}

function engineeringAppendixRows(result: AnalysisResult, centeringBasis: AnalysisResult['standardsProfile']['centeringStandardsBases'][keyof AnalysisResult['standardsProfile']['centeringStandardsBases']]) {
  return [
    ['Reference pack', result.standardsProfile.basisLabel],
    ['Reference version', result.standardsProfile.basisVersion],
    ['Release note', result.standardsProfile.releaseNote],
    ['Engineering acceptance note', centeringBasis.engineeringAcceptanceNote],
    ['Validation artifact', centeringBasis.validation.artifactPath],
    [],
    ['Release checklist'],
    ['Complete', 'Required', 'Item', 'Note'],
    ...result.releaseChecklist.map((item) => [item.complete ? 'Yes' : 'No', item.required ? 'Yes' : 'No', item.label, item.note]),
    [],
    ['Issues'],
    ['Severity', 'Code', 'Message'],
    ...result.issues.map((issue) => [issue.severity, issue.code, issue.message]),
    [],
    ['Reference code', 'Title', 'URL'],
    ...result.standardsProfile.references.map((reference) => [reference.code, reference.title, reference.url])
  ];
}

export function createWorkbook(project: AnalysisProject, result: AnalysisResult) {
  const workbook = XLSX.utils.book_new();
  const geometryRows = result.geometryResult?.derivedValues ?? [];
  const centeringBasis =
    result.standardsProfile.centeringStandardsBases[project.centerToleranceStandard] ??
    result.standardsProfile.centeringStandardsBases[result.standardsProfile.defaultCenterToleranceStandard];

  appendSheet(workbook, 'Project', [
    ['Project name', project.name],
    ['Analyst', project.analyst],
    ['Customer', project.customer],
    ['Part number', project.partNumber],
    ['Gear family', project.gearFamily],
    ['Shaft interface', project.shaftInterface],
    ['Unit system', project.unitSystem],
    ['Duty class', project.dutyClass],
    [
      'ISO flank tolerance class',
      project.iso1328FlankToleranceClass ? `Class ${project.iso1328FlankToleranceClass}` : undefined
    ],
    ['Center tolerance basis', project.centerToleranceStandard],
    ['Selected pathway', result.pathwayId],
    ['Status', result.status],
    ['Release gate', result.releaseGateStatus],
    ['Standards profile', `${result.standardsProfile.name} ${result.standardsProfile.version}`],
    ['Notes', project.notes]
  ]);

  appendSheet(workbook, 'Measurements', [
    ['Key', 'Label', 'Value', 'Unit', 'Method', 'Instrument', 'Uncertainty', 'Notes'],
    ...project.measurements.map((record) => [
      record.key,
      record.label,
      record.value,
      record.unit,
      record.method,
      record.instrument,
      record.uncertainty,
      record.notes
    ])
  ]);

  appendSheet(workbook, 'Derived Geometry', [
    ['Key', 'Label', 'Canonical value', 'Canonical unit', 'Source', 'Equation ID', 'Branch', 'Source keys', 'Rounding rule'],
    ...geometryRows.map((value) => [
      value.key,
      value.label,
      value.value,
      value.unit,
      value.source,
      value.equationId,
      value.branchId,
      value.sourceMeasurementKeys.join(', '),
      value.roundingRule
    ])
  ]);

  appendSheet(workbook, 'Machinist Worksheet', machinistWorksheetRows(project, result));
  appendSheet(workbook, 'Engineering Appendix', engineeringAppendixRows(result, centeringBasis));

  appendSheet(workbook, 'Standards Snapshot', [
    ['Profile', result.standardsProfile.name],
    ['Version', result.standardsProfile.version],
    ['Basis', result.standardsProfile.basisLabel],
    ['Basis version', result.standardsProfile.basisVersion],
    ['Summary', result.standardsProfile.summary],
    ['Provisional', result.standardsProfile.provisional ? 'Yes' : 'No'],
    ['Center tolerance basis', centeringBasis.standardCode],
    ['Centering basis ID', project.centerToleranceStandard],
    ['Centering basis source', centeringBasis.sourceReference],
    ['Centering basis URL', centeringBasis.sourceUrl],
    ['Validation artifact', centeringBasis.validation.artifactPath],
    ['Validation status', centeringBasis.validation.status],
    [],
    ['Reference code', 'Title', 'URL'],
    ...result.standardsProfile.references.map((reference) => [reference.code, reference.title, reference.url])
  ]);

  appendSheet(workbook, 'Trace', [
    [
      'Step ID',
      'Step',
      'Detail',
      'Reference',
      'Equation',
      'Equation ID',
      'Branch',
      'Output key',
      'Output label',
      'Output value',
      'Unit',
      'Source',
      'Source keys',
      'Rounding rule'
    ],
    ...result.trace.steps.flatMap((step) =>
      step.outputs.map((output) => [
        step.id,
        step.title,
        step.detail,
        step.reference,
        step.equation,
        step.equationId,
        step.branchId,
        output.key,
        output.label,
        output.value,
        output.unit,
        output.source,
        output.sourceMeasurementKeys.join(', '),
        output.roundingRule
      ])
    )
  ]);

  appendSheet(workbook, 'Recommendation', [
    ['Status', result.status],
    ['Release gate', result.releaseGateStatus],
    ['Headline', result.recommendation?.headline],
    ['Fit code', result.recommendation?.fitCode],
    ['Fit intent', result.recommendation?.fitIntent],
    ['Nominal size mm', result.recommendation?.nominalSizeMm],
    ['Recommended bore min mm', result.recommendation?.recommendedBoreMinMm],
    ['Recommended bore max mm', result.recommendation?.recommendedBoreMaxMm],
    ['Expected interface min mm', result.recommendation?.expectedInterfaceMinMm],
    ['Expected interface max mm', result.recommendation?.expectedInterfaceMaxMm],
    ['Hole basis', result.recommendation?.holeBasis],
    ['Shaft basis', result.recommendation?.shaftBasis],
    ['Key width mm', result.recommendation?.keyWidth],
    ['Key height mm', result.recommendation?.keyHeight],
    ['Hub keyway depth mm', result.recommendation?.keywayHubDepth],
    ['Key width tolerance mm', result.recommendation?.keywayWidthTolerance],
    ['Keyway depth tolerance mm', result.recommendation?.keywayDepthTolerance],
    ['Standards quantity', result.centeringResult?.standardsQuantityName],
    ['Allowable runout FrT um', result.centeringResult?.allowableRunoutFrTUm],
    ['Allowable center tolerance (TIR) mm', result.centeringResult?.allowableCenterToleranceTirMm],
    ['Reserve budget total TIR mm', result.centeringResult?.reserveBudgetTotalTirMm],
    ['Equivalent radial center offset mm', result.centeringResult?.equivalentRadialOffsetMm],
    [
      'ISO flank tolerance class',
      result.centeringResult ? `Class ${result.centeringResult.iso1328FlankToleranceClass}` : undefined
    ],
    ['Reference diameter mm', result.centeringResult?.referenceDiameterMm],
    ['Normal module mm', result.centeringResult?.normalModuleMm],
    ['Tolerance basis', result.centeringResult?.toleranceBasisReference],
    ['Engineering acceptance note', result.centeringResult?.acceptanceModeNote],
    ['Standards basis label', result.centeringResult?.standardsBasisLabel],
    ['Standards basis status', result.centeringResult?.standardsValidationStatus],
    [
      'Standards acceptance pass',
      result.centeringResult?.standardsAcceptancePass ? 'Yes' : result.centeringResult ? 'No' : undefined
    ],
    ['Setup evidence complete', result.centeringResult?.setupEvidenceComplete ? 'Yes' : result.centeringResult ? 'No' : undefined],
    ['Runout method confirmed', result.centeringResult?.standardsRunoutMethodConfirmed ? 'Yes' : result.centeringResult ? 'No' : undefined],
    ['Reserve budget complete', result.centeringResult?.centerToleranceBudgetComplete ? 'Yes' : result.centeringResult ? 'No' : undefined],
    ['Reserve budget confirmed', result.centeringResult?.centerToleranceBudgetConfirmed ? 'Yes' : result.centeringResult ? 'No' : undefined],
    [],
    ['Recommendation notes'],
    ...(result.recommendation?.notes.map((note) => [note]) ?? []),
    [],
    ['Centering release blockers'],
    ...((result.centeringResult?.releaseBlockReasons ?? []).map((reason) => [reason]))
  ]);

  return workbook;
}

export function downloadWorkbook(project: AnalysisProject, result: AnalysisResult) {
  const workbook = createWorkbook(project, result);
  const fileName = `${project.name.replace(/\s+/g, '-').toLowerCase() || 'gear-analysis'}.xlsx`;
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
