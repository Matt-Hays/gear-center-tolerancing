import type { AnalysisProject, MeasurementRecord } from '@/types/domain';

function baseMeasurement(
  key: MeasurementRecord['key'],
  label: string,
  unit: MeasurementRecord['unit'],
  value?: number,
  method = 'Measured from sample part',
  instrument = 'Calibrated shop tool',
  notes = ''
): MeasurementRecord {
  return {
    key,
    label,
    unit,
    value,
    method,
    instrument,
    notes
  };
}

export function createSampleProject(): AnalysisProject {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: 'Rack Pinion Sample',
    analyst: 'Sample Engineer',
    customer: 'Transformer Travel Switch',
    partNumber: 'TRV-RP-001',
    notes: 'Sample rack-and-pinion centering case used to validate the rack-first release gate, export packet, and machinist worksheet.',
    gearFamily: 'rackPinion',
    shaftInterface: 'keyed',
    unitSystem: 'imperial',
    dutyClass: 'normal',
    centerToleranceStandard: 'iso1328Part1Runout',
    iso1328FlankToleranceClass: 8,
    standardsProfileId: 'ansi-agma-hybrid-v1',
    selectedPathwayId: 'rack-centering',
    createdAt: now,
    updatedAt: now,
    releaseChecklistState: {
      standardsBasisConfirmed: true,
      standardsRunoutMethodConfirmed: true,
      damagedToothReviewComplete: true,
      legacyRunoutMethodConfirmed: true,
      centerToleranceBudgetConfirmed: true,
      independentHandCheckComplete: true
    },
    measurements: [
      baseMeasurement('toothCount', 'Tooth count', 'count', 20, 'Counted intact teeth', 'Visual inspection'),
      baseMeasurement('outsideDiameter', 'Outside diameter', 'in', 2.75, 'Outside micrometer', '1-3 in micrometer'),
      baseMeasurement('faceWidth', 'Face width', 'in', 1.25, 'Caliper', 'Digital caliper'),
      baseMeasurement('rackLinearPitch', 'Rack linear pitch', 'in', 0.3927, 'Pitch transfer', 'Comparator and scale'),
      baseMeasurement('runoutFrMeasured', 'Measured runout Fr', 'in', 0.001, 'Dial indicator', 'Tenths indicator'),
      baseMeasurement('mountingFaceRunout', 'Mounting face runout', 'in', 0.0005, 'Dial indicator', 'Tenths indicator'),
      baseMeasurement(
        'fitLocationTirReserve',
        'Fit and location reserve (TIR)',
        'in',
        0.0001575,
        'Converted from reviewed fit/location contributors',
        'Engineering worksheet',
        'Converted to TIR at the bore-centering datum from the reviewed fit and location stack.'
      ),
      baseMeasurement(
        'workholdingTirReserve',
        'Workholding reserve (TIR)',
        'in',
        0.0001181,
        'Converted from workholding repeatability review',
        'Engineering worksheet',
        'Represents fixturing and setup repeatability translated to TIR at the centering datum.'
      ),
      baseMeasurement(
        'measurementTirReserve',
        'Measurement reserve (TIR)',
        'in',
        0.0000787,
        'Converted from measurement transfer review',
        'Engineering worksheet',
        'Covers datum transfer and reading-resolution effects as a TIR-equivalent reserve.'
      ),
      baseMeasurement(
        'processTirReserve',
        'Process reserve (TIR)',
        'in',
        0.0002362,
        'Converted from machining process capability review',
        'Engineering worksheet',
        'Reserves TIR for broaching and finishing process variation at the same centering datum.'
      ),
      baseMeasurement(
        'additionalTirReserve',
        'Additional reserve (TIR)',
        'in',
        0.0001181,
        'Converted from additional legacy-part risk allowance',
        'Engineering worksheet',
        'Captures explicit legacy-part recreation risk that is not already included in the other reserve lines.'
      ),
      baseMeasurement('boreDiameterMeasured', 'Measured bore diameter', 'in', 1.5005, 'Bore gauge', 'Dial bore gauge'),
      baseMeasurement('shaftDiameterMeasured', 'Measured shaft diameter', 'in', 1.5, 'Micrometer', '1-2 in micrometer'),
      baseMeasurement('nominalShaftSize', 'Confirmed nominal shaft size', 'in', 1.5, 'Engineer confirmation', 'Standards review'),
      baseMeasurement('pressureAngleDeg', 'Pressure angle', 'deg', 20, 'Comparator', 'Optical comparator'),
      baseMeasurement('diametralPitch', 'Known transverse diametral pitch', 'ratio', 8, 'Reverse calculation cross-check', 'Engineering review'),
      baseMeasurement('existingKeyWidth', 'Measured key width', 'in', 0.375, 'Pin gauge / key sample', 'Gauge set'),
      baseMeasurement('existingKeyDepthHub', 'Measured hub keyway depth', 'in', 0.188, 'Depth blade', 'Depth micrometer')
    ]
  };
}
