import jsPDF from 'jspdf';
import { formatLengthMm, formatMeasurement } from '@/lib/formatters';
import {
  CENTER_TOLERANCE_METHOD_DEFAULTS,
  CENTER_TOLERANCE_METHOD_STEPS,
  CENTER_TOLERANCE_RESERVE_KEYS
} from '@/lib/guides/centerToleranceBudget';
import type { AnalysisProject, AnalysisResult } from '@/types/domain';

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 6) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 16, y);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

function addKeyValueRows(doc: jsPDF, rows: [string, string][], y: number) {
  let nextY = y;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 16, nextY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 78, nextY);
    nextY += 6;
  });
  return nextY;
}

function ensurePage(doc: jsPDF, y: number, required = 20) {
  if (y <= 277 - required) {
    return y;
  }

  doc.addPage();
  return 18;
}

export function createPdfReport(project: AnalysisProject, result: AnalysisResult) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const geometryValues = result.geometryResult?.derivedValues ?? [];
  const centeringBasis =
    result.standardsProfile.centeringStandardsBases[project.centerToleranceStandard] ??
    result.standardsProfile.centeringStandardsBases[result.standardsProfile.defaultCenterToleranceStandard];
  let y = 18;

  doc.setFillColor(15, 23, 34);
  doc.roundedRect(12, 12, 186, 28, 5, 5, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(
    result.centeringResult ? 'Center-Tolerance Worksheet' : 'Gear Bore Worksheet',
    18,
    24
  );
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.name}`, 18, 31);
  y = 50;

  doc.setTextColor(20, 32, 45);
  y = addSectionTitle(doc, 'Release Gate', y);
  y = addKeyValueRows(
    doc,
    [
      ['Result', result.status],
      ['Release gate', result.releaseGateStatus],
      ['Ready for machining review', result.releaseGateStatus === 'readyForMachiningReview' ? 'Yes' : 'No']
    ],
    y
  );

  if (result.centeringResult) {
    y += 3;
    y = addSectionTitle(doc, 'Centering', y);
    y = addKeyValueRows(
      doc,
      [
        [result.centeringResult.standardsQuantityName, result.centeringResult.allowableRunoutFrTDisplay],
        ['Standards basis', result.centeringResult.standardsBasisLabel],
        ['Basis status', result.centeringResult.standardsValidationStatus],
        ['Allowable center tolerance (TIR)', result.centeringResult.allowableCenterToleranceDisplay ?? 'Pending reserve budget'],
        [
          'Reserve budget total',
          result.centeringResult.reserveBudgetTotalTirMm !== undefined
            ? formatLengthMm(result.centeringResult.reserveBudgetTotalTirMm, project.unitSystem)
            : 'Pending reserve budget'
        ],
        ['Reference diameter', formatLengthMm(result.centeringResult.referenceDiameterMm, project.unitSystem)],
        ['Normal module', formatLengthMm(result.centeringResult.normalModuleMm, project.unitSystem)],
        ['ISO flank tolerance class', `Class ${result.centeringResult.iso1328FlankToleranceClass}`],
        ['Standards acceptance', result.centeringResult.standardsAcceptancePass ? 'Pass' : 'Blocked'],
        ['Setup evidence', result.centeringResult.setupEvidenceComplete ? 'Complete' : 'Incomplete'],
        ['Runout method confirmed', result.centeringResult.standardsRunoutMethodConfirmed ? 'Yes' : 'No'],
        ['Reserve budget complete', result.centeringResult.centerToleranceBudgetComplete ? 'Yes' : 'No'],
        ['Reserve budget confirmed', result.centeringResult.centerToleranceBudgetConfirmed ? 'Yes' : 'No']
      ],
      y
    );

    if (result.centeringResult.equivalentRadialOffsetMm !== undefined) {
      y = addKeyValueRows(
        doc,
        [['Equivalent radial center offset', formatLengthMm(result.centeringResult.equivalentRadialOffsetMm, project.unitSystem)]],
        y
      );
    }

    if (result.centeringResult.centerHeightFromRackPitchLineMm !== undefined) {
      y = addKeyValueRows(
        doc,
        [['Center height', formatLengthMm(result.centeringResult.centerHeightFromRackPitchLineMm, project.unitSystem)]],
        y
      );
    }

    y += 2;
    y = addWrappedText(doc, result.centeringResult.boreCenterBasis, 16, y, 178);
    y = addWrappedText(doc, result.centeringResult.toleranceBasisReference, 16, y + 1, 178, 5);
    y = addWrappedText(doc, result.centeringResult.acceptanceModeNote, 16, y + 1, 178, 5);
  }

  y += 5;
  y = addSectionTitle(doc, 'Fit', y);
  y = addKeyValueRows(
    doc,
    [
      ['Fit code', result.recommendation?.fitCode ?? 'N/A'],
      ['Nominal size', result.recommendation?.nominalSizeMm ? formatLengthMm(result.recommendation.nominalSizeMm, project.unitSystem) : 'N/A'],
      ['Bore minimum', result.recommendation?.recommendedBoreMinMm ? formatLengthMm(result.recommendation.recommendedBoreMinMm, project.unitSystem) : 'N/A'],
      ['Bore maximum', result.recommendation?.recommendedBoreMaxMm ? formatLengthMm(result.recommendation.recommendedBoreMaxMm, project.unitSystem) : 'N/A']
    ],
    y
  );

  doc.addPage();
  y = 18;
  y = addSectionTitle(doc, 'Machinist Checklist', y);
  result.centeringResult?.inspectionChecks.forEach((check) => {
    y = ensurePage(doc, y, 10);
    y = addWrappedText(doc, `- ${check}`, 16, y, 178, 5);
  });
  project.measurements
    .filter((record) => CENTER_TOLERANCE_RESERVE_KEYS.includes(record.key))
    .forEach((record) => {
      y = ensurePage(doc, y, 14);
      y = addWrappedText(
        doc,
        `- ${record.label}: ${record.value !== undefined ? `${record.value} ${record.unit}` : 'Not recorded'} | Method: ${record.method || 'Not recorded'} | Notes: ${record.notes || 'Not recorded'}`,
        16,
        y,
        178,
        5
      );
    });
  result.centeringResult?.machiningNotes.forEach((note) => {
    y = ensurePage(doc, y, 10);
    y = addWrappedText(doc, `- ${note}`, 16, y, 178, 5);
  });
  CENTER_TOLERANCE_METHOD_STEPS.forEach((step) => {
    y = ensurePage(doc, y, 10);
    y = addWrappedText(doc, `- ${step}`, 16, y, 178, 5);
  });
  CENTER_TOLERANCE_METHOD_DEFAULTS.forEach((rule) => {
    y = ensurePage(doc, y, 10);
    y = addWrappedText(doc, `- ${rule}`, 16, y, 178, 5);
  });

  y = ensurePage(doc, y + 6, 40);
  y = addSectionTitle(doc, 'Engineering Appendix', y);
  y = addWrappedText(doc, result.standardsProfile.releaseNote, 16, y, 178);
  y += 4;
  y = addKeyValueRows(
    doc,
    [
      ['Reference pack', `${result.standardsProfile.basisLabel} ${result.standardsProfile.basisVersion}`],
      ['Center tolerance basis', centeringBasis.standardCode],
      ['Center tolerance basis ID', project.centerToleranceStandard],
      ['Selected pathway', result.pathwayId],
      ['Gear family', project.gearFamily],
      ['Shaft interface', project.shaftInterface]
    ],
    y
  );

  y += 4;
  y = addSectionTitle(doc, 'Standards Basis', y);
  y = addWrappedText(doc, centeringBasis.sourceReference, 16, y, 178);
  y = addWrappedText(doc, centeringBasis.engineeringAcceptanceNote, 16, y + 1, 178, 5);
  y = addWrappedText(
    doc,
    `Validation artifact: ${centeringBasis.validation.artifactPath} (${centeringBasis.validation.status})`,
    16,
    y + 1,
    178,
    5
  );

  if (result.centeringResult?.releaseBlockReasons.length) {
    y += 4;
    y = addSectionTitle(doc, 'Centering Release Blockers', y);
    result.centeringResult.releaseBlockReasons.forEach((reason) => {
      y = ensurePage(doc, y, 10);
      y = addWrappedText(doc, `- ${reason}`, 16, y, 178, 5);
    });
  }

  y += 4;
  y = addSectionTitle(doc, 'Release Checklist', y);
  result.releaseChecklist.forEach((item) => {
    y = ensurePage(doc, y, 12);
    y = addWrappedText(doc, `${item.complete ? '[x]' : '[ ]'} ${item.label}`, 16, y, 178, 5);
    if (item.note) {
      y = addWrappedText(doc, item.note, 21, y, 173, 5);
    }
  });

  y += 4;
  y = addSectionTitle(doc, 'Issues', y);
  if (result.issues.length === 0) {
    y = addWrappedText(doc, 'No open issues.', 16, y, 178);
  } else {
    result.issues.forEach((issue) => {
      y = ensurePage(doc, y, 10);
      y = addWrappedText(doc, `${issue.severity.toUpperCase()}: ${issue.message}`, 16, y, 178, 5);
    });
  }

  y += 4;
  y = addSectionTitle(doc, 'Geometry Snapshot', y);
  geometryValues.forEach((value) => {
    y = ensurePage(doc, y, 10);
    y = addWrappedText(
      doc,
      `${value.label}: ${formatMeasurement(value.value, value.unit, project.unitSystem)}`,
      16,
      y,
      178,
      5
    );
  });

  doc.addPage();
  y = 18;
  y = addSectionTitle(doc, 'Trace', y);
  result.trace.steps.forEach((step) => {
    y = ensurePage(doc, y, 20);
    doc.setFont('helvetica', 'bold');
    doc.text(step.title, 16, y);
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, `${step.detail} (${step.reference})`, 16, y + 5, 178);
    y = addWrappedText(doc, `Equation ID: ${step.equationId} | Branch: ${step.branchId}`, 16, y, 178, 5);

    step.outputs.forEach((output) => {
      y = ensurePage(doc, y, 12);
      y = addWrappedText(
        doc,
        `${output.label}: ${formatMeasurement(output.value, output.unit, project.unitSystem)} [${output.source}] (${output.equationId}; sources: ${output.sourceMeasurementKeys.join(', ')})`,
        20,
        y,
        170,
        5
      );
    });

    y += 4;
  });

  return doc;
}

export function downloadPdfReport(project: AnalysisProject, result: AnalysisResult) {
  const doc = createPdfReport(project, result);
  const fileName = `${project.name.replace(/\s+/g, '-').toLowerCase() || 'gear-analysis'}.pdf`;
  doc.save(fileName);
}
