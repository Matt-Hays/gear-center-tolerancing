import type {
  GearFamily,
  MeasurementDefinition,
  MeasurementKey,
  MeasurementPathway,
  PathwayId,
  ShaftInterface,
  SupportedGearFamily
} from '@/types/domain';

export const supportedGearFamilies: SupportedGearFamily[] = ['spur', 'helical', 'rackPinion'];

export const measurementPathways: MeasurementPathway[] = [
  {
    id: 'rack-centering',
    title: 'Center before broach',
    description:
      'Rack-first release path that reconstructs the pinion from intact tooth geometry, confirms rack pitch, and captures the centering evidence required before broaching.',
    supportedFamilies: ['rackPinion'],
    requiredKeys: [
      'toothCount',
      'outsideDiameter',
      'faceWidth',
      'rackLinearPitch',
      'runoutFrMeasured',
      'mountingFaceRunout',
      'fitLocationTirReserve',
      'workholdingTirReserve',
      'measurementTirReserve',
      'processTirReserve',
      'additionalTirReserve',
      'boreDiameterMeasured',
      'shaftDiameterMeasured',
      'nominalShaftSize'
    ],
    optionalKeys: ['pressureAngleDeg'],
    crossCheckKeys: [
      'moduleMetric',
      'diametralPitch',
      'pitchDiameterKnown',
      'existingKeyWidth',
      'existingKeyDepthHub'
    ],
    consistencyRules: [
      {
        id: 'rack-centering-module-vs-dp',
        title: 'Optional module and diametral pitch inputs should agree with the rack centering reconstruction.',
        keys: ['moduleMetric', 'diametralPitch']
      }
    ]
  },
  {
    id: 'replicate-from-od',
    title: 'Reverse from outside diameter',
    description:
      'Derive pitch geometry from measured tooth count and outside diameter, then validate the shaft interface with optional cross-checks.',
    supportedFamilies: ['spur', 'helical', 'rackPinion'],
    requiredKeys: [
      'toothCount',
      'outsideDiameter',
      'faceWidth',
      'runoutFrMeasured',
      'mountingFaceRunout',
      'fitLocationTirReserve',
      'workholdingTirReserve',
      'measurementTirReserve',
      'processTirReserve',
      'additionalTirReserve',
      'boreDiameterMeasured',
      'shaftDiameterMeasured',
      'nominalShaftSize'
    ],
    optionalKeys: ['pressureAngleDeg'],
    crossCheckKeys: [
      'moduleMetric',
      'diametralPitch',
      'pitchDiameterKnown',
      'existingKeyWidth',
      'existingKeyDepthHub'
    ],
    familySpecificRequired: {
      helical: ['helixAngleDeg']
    },
    familySpecificCrossChecks: {
      rackPinion: ['rackLinearPitch']
    },
    consistencyRules: [
      {
        id: 'replicate-module-vs-dp',
        title: 'Optional module and diametral pitch inputs should agree when both are present.',
        keys: ['moduleMetric', 'diametralPitch']
      }
    ]
  },
  {
    id: 'direct-pitch',
    title: 'Direct pitch confirmation',
    description:
      'Use a known transverse module or diametral pitch as the governing input and treat outside diameter and rack pitch as validation cross-checks.',
    supportedFamilies: ['spur', 'helical', 'rackPinion'],
    requiredKeys: [
      'toothCount',
      'faceWidth',
      'runoutFrMeasured',
      'mountingFaceRunout',
      'fitLocationTirReserve',
      'workholdingTirReserve',
      'measurementTirReserve',
      'processTirReserve',
      'additionalTirReserve',
      'boreDiameterMeasured',
      'shaftDiameterMeasured',
      'nominalShaftSize'
    ],
    optionalKeys: ['pressureAngleDeg'],
    crossCheckKeys: [
      'outsideDiameter',
      'pitchDiameterKnown',
      'existingKeyWidth',
      'existingKeyDepthHub',
      'moduleMetric',
      'diametralPitch'
    ],
    familySpecificRequired: {
      helical: ['helixAngleDeg']
    },
    familySpecificCrossChecks: {
      rackPinion: ['rackLinearPitch']
    },
    oneOfGroups: [['moduleMetric', 'diametralPitch']],
    consistencyRules: [
      {
        id: 'direct-module-vs-dp',
        title: 'Module and diametral pitch should resolve to the same transverse system when both are supplied.',
        keys: ['moduleMetric', 'diametralPitch']
      }
    ]
  }
];

export const measurementDefinitions: MeasurementDefinition[] = [
  {
    key: 'toothCount',
    label: 'Tooth count',
    description: 'Count the active teeth on the measured gear or the mating pinion.',
    unit: 'count',
    dimension: 'count',
    step: 'geometry',
    placeholder: '32'
  },
  {
    key: 'outsideDiameter',
    label: 'Outside diameter',
    description: 'Measured tip diameter of the external gear or pinion.',
    unit: 'mm',
    dimension: 'length',
    step: 'geometry',
    placeholder: '86.36'
  },
  {
    key: 'faceWidth',
    label: 'Face width',
    description: 'Toothed face width retained for traceability and replacement-part notes.',
    unit: 'mm',
    dimension: 'length',
    step: 'geometry',
    placeholder: '22.225'
  },
  {
    key: 'boreDiameterMeasured',
    label: 'Measured bore diameter',
    description: 'Current measured bore size prior to selecting a broach or finish tolerance.',
    unit: 'mm',
    dimension: 'length',
    step: 'interface',
    placeholder: '25.408'
  },
  {
    key: 'shaftDiameterMeasured',
    label: 'Measured shaft diameter',
    description: 'Measured mating shaft diameter used to review current fit and nominal size selection.',
    unit: 'mm',
    dimension: 'length',
    step: 'interface',
    placeholder: '25.397'
  },
  {
    key: 'nominalShaftSize',
    label: 'Confirmed nominal shaft size',
    description: 'Engineer-confirmed basic shaft size used to select keyed or interference fit tables.',
    unit: 'mm',
    dimension: 'length',
    step: 'interface',
    placeholder: '25.4'
  },
  {
    key: 'pressureAngleDeg',
    label: 'Pressure angle',
    description: 'Optional pressure-angle cross-check retained for engineering context.',
    unit: 'deg',
    dimension: 'angle',
    step: 'geometry',
    placeholder: '20'
  },
  {
    key: 'helixAngleDeg',
    label: 'Helix angle',
    description: 'Required for helical gears to transform between transverse and normal systems.',
    unit: 'deg',
    dimension: 'angle',
    step: 'geometry',
    applicableFamilies: ['helical'],
    placeholder: '15'
  },
  {
    key: 'rackLinearPitch',
    label: 'Rack linear pitch',
    description: 'Measured rack pitch used to validate rack-and-pinion reconstruction and centering readiness.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    applicableFamilies: ['rackPinion'],
    placeholder: '9.9746'
  },
  {
    key: 'moduleMetric',
    label: 'Known transverse module',
    description: 'Known transverse module used directly or as a cross-check against measured geometry.',
    unit: 'mm',
    dimension: 'length',
    step: 'geometry',
    placeholder: '2.54'
  },
  {
    key: 'diametralPitch',
    label: 'Known transverse diametral pitch',
    description: 'Known transverse diametral pitch used directly or to validate a measured outside diameter.',
    unit: 'ratio',
    dimension: 'ratio',
    step: 'geometry',
    placeholder: '10'
  },
  {
    key: 'pitchDiameterKnown',
    label: 'Known pitch diameter',
    description: 'Optional known pitch diameter used to validate the reconstructed pitch system.',
    unit: 'mm',
    dimension: 'length',
    step: 'validation',
    placeholder: '81.28'
  },
  {
    key: 'existingKeyWidth',
    label: 'Measured key width',
    description: 'Measured existing key or hub keyway width used to compare against the standards recommendation.',
    unit: 'mm',
    dimension: 'length',
    step: 'validation',
    applicableInterfaces: ['keyed'],
    placeholder: '6.35'
  },
  {
    key: 'existingKeyDepthHub',
    label: 'Measured hub keyway depth',
    description: 'Measured existing hub keyway depth used to compare with the broach recommendation.',
    unit: 'mm',
    dimension: 'length',
    step: 'validation',
    applicableInterfaces: ['keyed'],
    placeholder: '3.175'
  },
  {
    key: 'runoutFrMeasured',
    label: 'Measured runout Fr',
    description:
      'Measured ISO-style runout Fr taken from successive tooth-space radial readings and used as the released standards acceptance quantity.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.025'
  },
  {
    key: 'mountingFaceRunout',
    label: 'Mounting face runout',
    description: 'Measured face runout used only to confirm workholding or setup alignment before finding bore center.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.013'
  },
  {
    key: 'fitLocationTirReserve',
    label: 'Fit and location reserve (TIR)',
    description: 'Enter the TIR-equivalent reserve held back for fit and location contributors at the same centering datum as Fr.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.004'
  },
  {
    key: 'workholdingTirReserve',
    label: 'Workholding reserve (TIR)',
    description: 'Enter the TIR-equivalent reserve consumed by chucking, fixturing, or setup repeatability at the centering datum.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.003'
  },
  {
    key: 'measurementTirReserve',
    label: 'Measurement reserve (TIR)',
    description: 'Enter the TIR-equivalent reserve held for measurement conversion, resolution, and datum-transfer effects.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.002'
  },
  {
    key: 'processTirReserve',
    label: 'Process reserve (TIR)',
    description: 'Enter the TIR-equivalent reserve for machining process variation at the same datum used for Fr.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.006'
  },
  {
    key: 'additionalTirReserve',
    label: 'Additional reserve (TIR)',
    description: 'Enter any other explicitly justified TIR-equivalent reserve that must be subtracted before releasing center tolerance.',
    unit: 'mm',
    dimension: 'length',
    step: 'centering',
    placeholder: '0.003'
  }
];

export function getMeasurementDefinition(key: MeasurementKey) {
  return measurementDefinitions.find((definition) => definition.key === key);
}

export function getPathway(pathwayId: PathwayId) {
  return measurementPathways.find((pathway) => pathway.id === pathwayId) ?? measurementPathways[0];
}

function mergePathwayKeys(
  pathway: MeasurementPathway,
  gearFamily: GearFamily,
  shaftInterface: ShaftInterface,
  selector: 'requiredKeys' | 'optionalKeys' | 'crossCheckKeys',
  familySelector: 'familySpecificRequired' | 'familySpecificOptional' | 'familySpecificCrossChecks',
  interfaceSelector: 'interfaceSpecificRequired' | 'interfaceSpecificOptional'
) {
  const keys = new Set<MeasurementKey>(pathway[selector] ?? []);

  if (gearFamily === 'spur' || gearFamily === 'helical' || gearFamily === 'rackPinion') {
    pathway[familySelector]?.[gearFamily]?.forEach((key) => keys.add(key));
  }

  pathway[interfaceSelector]?.[shaftInterface]?.forEach((key) => keys.add(key));

  return Array.from(keys);
}

export function getRequiredKeys(
  pathwayId: PathwayId,
  gearFamily: GearFamily,
  shaftInterface: ShaftInterface
): MeasurementKey[] {
  const pathway = getPathway(pathwayId);

  return mergePathwayKeys(
    pathway,
    gearFamily,
    shaftInterface,
    'requiredKeys',
    'familySpecificRequired',
    'interfaceSpecificRequired'
  );
}

export function getVisibleMeasurements(
  gearFamily: GearFamily,
  shaftInterface: ShaftInterface,
  pathwayId: PathwayId
) {
  const pathway = getPathway(pathwayId);
  const visibleKeys = new Set<MeasurementKey>([
    ...getRequiredKeys(pathwayId, gearFamily, shaftInterface),
    ...mergePathwayKeys(
      pathway,
      gearFamily,
      shaftInterface,
      'optionalKeys',
      'familySpecificOptional',
      'interfaceSpecificOptional'
    ),
    ...mergePathwayKeys(
      pathway,
      gearFamily,
      shaftInterface,
      'crossCheckKeys',
      'familySpecificCrossChecks',
      'interfaceSpecificOptional'
    ),
    ...(pathway.oneOfGroups?.flat() ?? [])
  ]);

  return measurementDefinitions.filter((definition) => {
    const familyOk = !definition.applicableFamilies || definition.applicableFamilies.includes(gearFamily);
    const interfaceOk =
      !definition.applicableInterfaces || definition.applicableInterfaces.includes(shaftInterface);

    return familyOk && interfaceOk && visibleKeys.has(definition.key);
  });
}
