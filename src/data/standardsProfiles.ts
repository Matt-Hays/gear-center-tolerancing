import type {
  CenterToleranceStandard,
  Iso1328FlankToleranceClass,
  StandardsProfile,
  ValidationIssue
} from '@/types/domain';

const keyedBands = [
  { minDiameterMm: 6, maxDiameterMm: 10, holeLowerUm: 0, holeUpperUm: 15, shaftLowerUm: -9, shaftUpperUm: 0 },
  { minDiameterMm: 10, maxDiameterMm: 18, holeLowerUm: 0, holeUpperUm: 18, shaftLowerUm: -11, shaftUpperUm: 0 },
  { minDiameterMm: 18, maxDiameterMm: 30, holeLowerUm: 0, holeUpperUm: 21, shaftLowerUm: -13, shaftUpperUm: 0 },
  { minDiameterMm: 30, maxDiameterMm: 50, holeLowerUm: 0, holeUpperUm: 25, shaftLowerUm: -16, shaftUpperUm: 0 },
  { minDiameterMm: 50, maxDiameterMm: 80, holeLowerUm: 0, holeUpperUm: 30, shaftLowerUm: -19, shaftUpperUm: 0 },
  { minDiameterMm: 80, maxDiameterMm: 120, holeLowerUm: 0, holeUpperUm: 35, shaftLowerUm: -22, shaftUpperUm: 0 },
  { minDiameterMm: 120, maxDiameterMm: 180, holeLowerUm: 0, holeUpperUm: 40, shaftLowerUm: -25, shaftUpperUm: 0 }
];

const lightInterferenceBands = [
  { minDiameterMm: 6, maxDiameterMm: 10, holeLowerUm: 0, holeUpperUm: 15, shaftLowerUm: 12, shaftUpperUm: 21 },
  { minDiameterMm: 10, maxDiameterMm: 18, holeLowerUm: 0, holeUpperUm: 18, shaftLowerUm: 16, shaftUpperUm: 27 },
  { minDiameterMm: 18, maxDiameterMm: 30, holeLowerUm: 0, holeUpperUm: 21, shaftLowerUm: 20, shaftUpperUm: 33 },
  { minDiameterMm: 30, maxDiameterMm: 50, holeLowerUm: 0, holeUpperUm: 25, shaftLowerUm: 26, shaftUpperUm: 42 },
  { minDiameterMm: 50, maxDiameterMm: 80, holeLowerUm: 0, holeUpperUm: 30, shaftLowerUm: 32, shaftUpperUm: 51 },
  { minDiameterMm: 80, maxDiameterMm: 120, holeLowerUm: 0, holeUpperUm: 35, shaftLowerUm: 40, shaftUpperUm: 62 },
  { minDiameterMm: 120, maxDiameterMm: 180, holeLowerUm: 0, holeUpperUm: 40, shaftLowerUm: 46, shaftUpperUm: 71 }
];

const normalInterferenceBands = [
  { minDiameterMm: 6, maxDiameterMm: 10, holeLowerUm: 0, holeUpperUm: 15, shaftLowerUm: 20, shaftUpperUm: 29 },
  { minDiameterMm: 10, maxDiameterMm: 18, holeLowerUm: 0, holeUpperUm: 18, shaftLowerUm: 25, shaftUpperUm: 36 },
  { minDiameterMm: 18, maxDiameterMm: 30, holeLowerUm: 0, holeUpperUm: 21, shaftLowerUm: 31, shaftUpperUm: 44 },
  { minDiameterMm: 30, maxDiameterMm: 50, holeLowerUm: 0, holeUpperUm: 25, shaftLowerUm: 38, shaftUpperUm: 54 },
  { minDiameterMm: 50, maxDiameterMm: 80, holeLowerUm: 0, holeUpperUm: 30, shaftLowerUm: 46, shaftUpperUm: 65 },
  { minDiameterMm: 80, maxDiameterMm: 120, holeLowerUm: 0, holeUpperUm: 35, shaftLowerUm: 54, shaftUpperUm: 76 },
  { minDiameterMm: 120, maxDiameterMm: 180, holeLowerUm: 0, holeUpperUm: 40, shaftLowerUm: 62, shaftUpperUm: 87 }
];

const shockInterferenceBands = [
  { minDiameterMm: 6, maxDiameterMm: 10, holeLowerUm: 0, holeUpperUm: 15, shaftLowerUm: 28, shaftUpperUm: 37 },
  { minDiameterMm: 10, maxDiameterMm: 18, holeLowerUm: 0, holeUpperUm: 18, shaftLowerUm: 34, shaftUpperUm: 45 },
  { minDiameterMm: 18, maxDiameterMm: 30, holeLowerUm: 0, holeUpperUm: 21, shaftLowerUm: 42, shaftUpperUm: 55 },
  { minDiameterMm: 30, maxDiameterMm: 50, holeLowerUm: 0, holeUpperUm: 25, shaftLowerUm: 51, shaftUpperUm: 67 },
  { minDiameterMm: 50, maxDiameterMm: 80, holeLowerUm: 0, holeUpperUm: 30, shaftLowerUm: 61, shaftUpperUm: 80 },
  { minDiameterMm: 80, maxDiameterMm: 120, holeLowerUm: 0, holeUpperUm: 35, shaftLowerUm: 72, shaftUpperUm: 94 },
  { minDiameterMm: 120, maxDiameterMm: 180, holeLowerUm: 0, holeUpperUm: 40, shaftLowerUm: 82, shaftUpperUm: 107 }
];

const imperialKeys = [
  { minShaft: 0.3125, maxShaft: 0.4375, width: 0.125, height: 0.125, hubKeyseatDepth: 0.062, widthTolerance: 0.001, depthTolerance: 0.0015, unit: 'in' },
  { minShaft: 0.4375, maxShaft: 0.5625, width: 0.125, height: 0.125, hubKeyseatDepth: 0.062, widthTolerance: 0.001, depthTolerance: 0.0015, unit: 'in' },
  { minShaft: 0.5625, maxShaft: 0.875, width: 0.1875, height: 0.1875, hubKeyseatDepth: 0.093, widthTolerance: 0.001, depthTolerance: 0.0015, unit: 'in' },
  { minShaft: 0.875, maxShaft: 1.25, width: 0.25, height: 0.25, hubKeyseatDepth: 0.125, widthTolerance: 0.0015, depthTolerance: 0.002, unit: 'in' },
  { minShaft: 1.25, maxShaft: 1.375, width: 0.3125, height: 0.3125, hubKeyseatDepth: 0.156, widthTolerance: 0.0015, depthTolerance: 0.002, unit: 'in' },
  { minShaft: 1.375, maxShaft: 1.75, width: 0.375, height: 0.375, hubKeyseatDepth: 0.188, widthTolerance: 0.0015, depthTolerance: 0.0025, unit: 'in' },
  { minShaft: 1.75, maxShaft: 2.25, width: 0.5, height: 0.5, hubKeyseatDepth: 0.25, widthTolerance: 0.002, depthTolerance: 0.003, unit: 'in' },
  { minShaft: 2.25, maxShaft: 2.75, width: 0.625, height: 0.625, hubKeyseatDepth: 0.313, widthTolerance: 0.002, depthTolerance: 0.003, unit: 'in' }
] as const;

const metricKeys = [
  { minShaft: 6, maxShaft: 8, width: 2, height: 2, hubKeyseatDepth: 1.2, widthTolerance: 0.012, depthTolerance: 0.03, unit: 'mm' },
  { minShaft: 8, maxShaft: 10, width: 3, height: 3, hubKeyseatDepth: 1.4, widthTolerance: 0.015, depthTolerance: 0.03, unit: 'mm' },
  { minShaft: 10, maxShaft: 12, width: 4, height: 4, hubKeyseatDepth: 1.8, widthTolerance: 0.015, depthTolerance: 0.03, unit: 'mm' },
  { minShaft: 12, maxShaft: 17, width: 5, height: 5, hubKeyseatDepth: 2.3, widthTolerance: 0.018, depthTolerance: 0.04, unit: 'mm' },
  { minShaft: 17, maxShaft: 22, width: 6, height: 6, hubKeyseatDepth: 2.8, widthTolerance: 0.018, depthTolerance: 0.04, unit: 'mm' },
  { minShaft: 22, maxShaft: 30, width: 8, height: 7, hubKeyseatDepth: 3.3, widthTolerance: 0.022, depthTolerance: 0.05, unit: 'mm' },
  { minShaft: 30, maxShaft: 38, width: 10, height: 8, hubKeyseatDepth: 3.3, widthTolerance: 0.022, depthTolerance: 0.05, unit: 'mm' },
  { minShaft: 38, maxShaft: 44, width: 12, height: 8, hubKeyseatDepth: 3.3, widthTolerance: 0.027, depthTolerance: 0.05, unit: 'mm' },
  { minShaft: 44, maxShaft: 50, width: 14, height: 9, hubKeyseatDepth: 3.8, widthTolerance: 0.027, depthTolerance: 0.06, unit: 'mm' },
  { minShaft: 50, maxShaft: 58, width: 16, height: 10, hubKeyseatDepth: 4.3, widthTolerance: 0.033, depthTolerance: 0.06, unit: 'mm' },
  { minShaft: 58, maxShaft: 65, width: 18, height: 11, hubKeyseatDepth: 4.4, widthTolerance: 0.033, depthTolerance: 0.06, unit: 'mm' },
  { minShaft: 65, maxShaft: 75, width: 20, height: 12, hubKeyseatDepth: 4.9, widthTolerance: 0.033, depthTolerance: 0.07, unit: 'mm' },
  { minShaft: 75, maxShaft: 85, width: 22, height: 14, hubKeyseatDepth: 5.4, widthTolerance: 0.039, depthTolerance: 0.07, unit: 'mm' },
  { minShaft: 85, maxShaft: 95, width: 25, height: 14, hubKeyseatDepth: 5.4, widthTolerance: 0.039, depthTolerance: 0.07, unit: 'mm' },
  { minShaft: 95, maxShaft: 110, width: 28, height: 16, hubKeyseatDepth: 6.4, widthTolerance: 0.046, depthTolerance: 0.08, unit: 'mm' },
  { minShaft: 110, maxShaft: 130, width: 32, height: 18, hubKeyseatDepth: 7.4, widthTolerance: 0.054, depthTolerance: 0.09, unit: 'mm' }
] as const;

const isoClassNumbers: Iso1328FlankToleranceClass[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const setupGuidanceReferences = [
  {
    code: 'ISO/TR 10064-1:2019',
    title: 'Code of inspection practice - Part 1: Inspection of corresponding flanks of gear teeth',
    url: 'https://www.iso.org/standard/77653.html'
  },
  {
    code: 'AGMA ISO 10064-1-A21',
    title: 'Code of inspection practice - Part 1: Inspection of corresponding flanks of gear teeth',
    url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=10064_1_A21'
  },
  {
    code: 'ISO/TR 10064-2:1996',
    title: 'Code of inspection practice - Part 2: Recommendations relative to radial composite deviations, runout, tooth thickness and backlash',
    url: 'https://www.iso.org/ru/standard/18033.html'
  },
  {
    code: 'ISO/TR 10064-3:1996',
    title: 'Code of inspection practice - Part 3: Recommendations relative to gear blanks, shaft centre distance and bearing contact',
    url: 'https://www.iso.org/fr/standard/23866.html'
  },
  {
    code: 'AGMA 915-2-A05',
    title: 'Inspection practices - Recommended practices relative to radial composite deviations, runout, tooth thickness and backlash',
    url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=915-2-A05'
  },
  {
    code: 'AGMA 915-3-A99',
    title: 'Inspection practices - Recommended practices relative to gear blanks, shaft center distance and bearing contact',
    url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=915_3_A99'
  }
] as const;

const centeringStandardsBases: StandardsProfile['centeringStandardsBases'] = {
  iso1328Part1Runout: {
    id: 'iso1328Part1Runout',
    releaseMode: 'standardsPlusReserveBudget',
    displayLabel: 'ISO flank tolerance class',
    standardCode: 'ISO 1328-1:2013 / ANSI/AGMA ISO 1328-1-B14',
    standardTitle: 'Cylindrical gears - ISO system of flank tolerance classification - Part 1',
    standardEdition: '2013 / B14',
    quantityName: 'Allowable ISO runout FrT',
    quantitySymbol: 'FrT',
    quantityReference: 'Normative standards quantity currently carried from the controlled internal validation extract.',
    clauseReference: 'Controlled internal extract: Clause 5.3 / Annex E relationship with Clause 5.2.3 rounding.',
    sourceReference:
      'Controlled internal validation extract for the ISO 1328-1:2013 / ANSI/AGMA ISO 1328-1-B14 runout relationship. This basis remains provisional until matched against a purchased or formally approved internal extract.',
    sourceUrl:
      'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=1328_1_B14',
    measurementMethodLabel: 'Standards-conformant runout Fr measurement',
    measurementMethodNote:
      'Confirm that the recorded Fr value was taken using the approved inspection method before relying on the standards result for release.',
    variableDefinitions: {
      referenceDiameter: 'Reference diameter d in mm',
      normalModule: 'Normal module mn in mm',
      flankToleranceClass: 'ISO flank tolerance class A',
      toothCount: 'Tooth count z',
      faceWidth: 'Face width b in mm',
      helixAngle: 'Helix angle beta in degrees'
    },
    validation: {
      status: 'provisional',
      artifactPath: 'docs/validation/iso1328-runout-validation.md',
      artifactRevision: '2026.4-provisional',
      note:
        'The repository carries a structured validation packet, but the numeric relationship is still treated as provisional until second-engineer signoff against the purchased/internal extract is recorded.'
    },
    applicability: {
      toothCount: {
        min: 5,
        max: 1000
      },
      referenceDiameterMm: {
        min: 5,
        max: 15000
      },
      normalModuleMm: {
        min: 0.5,
        max: 70
      },
      faceWidthMm: {
        min: 4,
        max: 1200
      },
      helixAngleAbsDeg: {
        max: 45
      }
    },
    rounding: {
      mode: 'iso1328Clause5.2.3Micrometre',
      description:
        'Round in micrometres: values above 10 um to the nearest 1 um, values from 5 to 10 um to the nearest 0.5 um, and values below 5 um to the nearest 0.1 um.'
    },
    formula: {
      equationId: 'ISO1328-RUNOUT-01',
      expression: 'FrT = 0.9 * (0.002 d + 0.55 sqrt(d) + 0.7 mn + 12) * (sqrt(2))^(A - 5)',
      runoutFactor: 0.9,
      referenceDiameterCoeff: 0.002,
      sqrtReferenceDiameterCoeff: 0.55,
      normalModuleCoeff: 0.7,
      constant: 12,
      classFactorBase: Math.SQRT2,
      classFactorReferenceClass: 5
    },
    engineeringAcceptanceNote:
      'The reported standards quantity is a deterministic engineering acceptance limit from the selected ISO basis. The allowable center tolerance is an internal reserve-budget method layered on that quantity, not a direct ISO output and not a statistical tolerance interval.',
    classNumbers: [...isoClassNumbers],
    setupGuidanceReferences: [...setupGuidanceReferences],
    internalAppliedLimit: {
      status: 'approved',
      label: 'Allowable center tolerance (TIR)',
      note:
        'Use the explicit reserve-budget worksheet to subtract TIR-equivalent contributors from the normative ISO runout FrT. Do not infer reserve lines from setup evidence or fit tables automatically.',
      equationId: 'CENTER-TOLERANCE-BUDGET-01'
    }
  },
  iso1328Part2RadialRunout: {
    id: 'iso1328Part2RadialRunout',
    releaseMode: 'standardsOnly',
    displayLabel: 'ISO flank tolerance class',
    standardCode: 'ISO 1328-2:2020 / ANSI/AGMA ISO 1328-2-A21',
    standardTitle: 'Cylindrical gears - ISO system of flank tolerance classification - Part 2',
    standardEdition: '2020 / A21',
    quantityName: 'Radial runout quantity pending approved extract',
    quantitySymbol: 'Pending extract',
    quantityReference: 'Reserved for a future approved radial runout basis once the purchased/internal extract is checked in.',
    clauseReference: 'Disabled until the approved internal extract and validation packet are supplied.',
    sourceReference:
      'This basis is intentionally disabled in the shipped app because the approved internal extract has not yet been added.',
    sourceUrl:
      'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=1328_2_A21',
    measurementMethodLabel: 'Disabled basis',
    measurementMethodNote: 'This basis is not available for release use in the shipped app.',
    variableDefinitions: {
      referenceDiameter: 'Reference diameter d in mm',
      normalModule: 'Normal module mn in mm',
      flankToleranceClass: 'ISO flank tolerance class A',
      toothCount: 'Tooth count z',
      faceWidth: 'Face width b in mm',
      helixAngle: 'Helix angle beta in degrees'
    },
    validation: {
      status: 'disabled',
      artifactPath: 'docs/validation/iso1328-runout-validation.md',
      artifactRevision: 'reserved',
      note: 'Disabled until the approved Part 2 validation packet is added and signed off.'
    },
    applicability: {
      toothCount: {
        min: 5,
        max: 1000
      },
      referenceDiameterMm: {
        min: 5,
        max: 15000
      },
      normalModuleMm: {
        min: 0.5,
        max: 70
      },
      faceWidthMm: {
        min: 4,
        max: 1200
      },
      helixAngleAbsDeg: {
        max: 45
      }
    },
    rounding: {
      mode: 'iso1328Clause5.2.3Micrometre',
      description: 'Disabled basis. No released rounding rule is shipped until the approved internal extract is added.'
    },
    engineeringAcceptanceNote:
      'This basis is disabled in the shipped application and cannot be used to clear release.',
    classNumbers: [...isoClassNumbers],
    setupGuidanceReferences: [...setupGuidanceReferences],
    internalAppliedLimit: {
      status: 'unapproved',
      label: 'Allowable center tolerance (TIR)',
      note: 'Disabled basis. No applied mapping is available.',
      equationId: 'CENTER-APPLIED-LIMIT-DISABLED'
    }
  }
};

export const standardsProfiles: StandardsProfile[] = [
  {
    id: 'ansi-agma-hybrid-v1',
    name: 'Published Reference Pack',
    version: '2026.4',
    basisLabel: 'ISO / ANSI-AGMA / ASME Published Reference Pack',
    basisVersion: '2026.4',
    summary:
      'Locked published reference pack for reverse engineering and bore tolerancing with an ISO runout basis plus explicit reserve-budget center-tolerance workflow.',
    provisional: false,
    releaseNote:
      'The centering workflow reports the normative ISO runout quantity FrT and, when the reserve worksheet is complete, the internal allowable center tolerance (TIR). Machining release still remains blocked until the standards basis, reserve budget confirmation, and independent hand check are complete.',
    references: [
      {
        code: 'ISO 1328-1:2013',
        title: 'Cylindrical gears - ISO system of flank tolerance classification - Part 1',
        url: 'https://www.iso.org/obp/ui/?_escaped_fragment_=iso%3Astd%3Aiso%3A1328%3A-1%3Aed-2%3Av1%3Aen'
      },
      {
        code: 'ANSI/AGMA ISO 1328-1-B14',
        title: 'Cylindrical Gears - ISO System of Flank Tolerance Classification - Part 1',
        url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=1328_1_B14'
      },
      {
        code: 'ISO 1328-2:2020',
        title: 'Cylindrical gears - ISO system of flank tolerance classification - Part 2',
        url: 'https://www.iso.org/es/contents/data/standard/07/03/70386.html'
      },
      {
        code: 'ANSI/AGMA ISO 1328-2-A21',
        title: 'Cylindrical Gears - ISO System of Flank Tolerance Classification - Part 2',
        url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=1328_2_A21'
      },
      {
        code: 'ISO/TR 10064-1:2019',
        title: 'Code of inspection practice - Part 1: Inspection of corresponding flanks of gear teeth',
        url: 'https://www.iso.org/standard/77653.html'
      },
      {
        code: 'AGMA ISO 10064-1-A21',
        title: 'Code of inspection practice - Part 1: Inspection of corresponding flanks of gear teeth',
        url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=10064_1_A21'
      },
      {
        code: 'ISO/TR 10064-2:1996',
        title: 'Code of inspection practice - Part 2: Recommendations relative to radial composite deviations, runout, tooth thickness and backlash',
        url: 'https://www.iso.org/ru/standard/18033.html'
      },
      {
        code: 'ISO/TR 10064-3:1996',
        title: 'Code of inspection practice - Part 3: Recommendations relative to gear blanks, shaft centre distance and bearing contact',
        url: 'https://www.iso.org/fr/standard/23866.html'
      },
      {
        code: 'AGMA 915-2-A05',
        title: 'Inspection practices - Recommended practices relative to radial composite deviations, runout, tooth thickness and backlash',
        url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=915-2-A05'
      },
      {
        code: 'AGMA 915-3-A99',
        title: 'Inspection practices - Recommended practices relative to gear blanks, shaft center distance and bearing contact',
        url: 'https://members.agma.org/MyAGMA/MyAGMA/Store/Item_Detail.aspx?Category=STANDARDS&iProductCode=915_3_A99'
      },
      {
        code: 'ISO 286-1:2010',
        title: 'ISO code system for tolerances on linear sizes',
        url: 'https://www.iso.org/standard/45975.html'
      },
      {
        code: 'ASME B4.1',
        title: 'Preferred Limits and Fits for Cylindrical Parts',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/preferred-limits-and-fits-for-cylindrical-parts'
      },
      {
        code: 'ASME B4.2',
        title: 'Preferred Metric Limits and Fits',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b4-2-preferred-metric-limits-fits'
      },
      {
        code: 'ASME B17.1',
        title: 'Keys and Keyseats',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b17-1-keys-keyseats'
      }
    ],
    fitDefinitions: {
      keyed: {
        code: 'H7/h6',
        title: 'Close locating fit for keyed hubs',
        holeBasis: 'H7',
        shaftBasis: 'h6',
        intent: 'Use a controlled sliding fit and transmit torque through the key while preserving repeatable hub location.',
        bands: keyedBands
      },
      interferenceByDuty: {
        light: {
          code: 'H7/p6',
          title: 'Light drive interference fit',
          holeBasis: 'H7',
          shaftBasis: 'p6',
          intent: 'Light torque transmission with reduced assembly force compared with heavier drive fits.',
          bands: lightInterferenceBands
        },
        normal: {
          code: 'H7/s6',
          title: 'Normal duty drive interference fit',
          holeBasis: 'H7',
          shaftBasis: 's6',
          intent: 'General industrial interference fit for repeatable torque transfer and moderate shock.',
          bands: normalInterferenceBands
        },
        shock: {
          code: 'H7/u6',
          title: 'Shock duty interference fit',
          holeBasis: 'H7',
          shaftBasis: 'u6',
          intent: 'Higher retention interference for shock or reversing load cases when assembly force is acceptable.',
          bands: shockInterferenceBands
        }
      }
    },
    defaultCenterToleranceStandard: 'iso1328Part1Runout',
    centeringStandardsBases,
    keyDefinitions: {
      imperial: imperialKeys.map((entry) => ({ ...entry })),
      metric: metricKeys.map((entry) => ({ ...entry }))
    }
  }
];

export function getStandardsProfile(profileId: string) {
  return standardsProfiles.find((profile) => profile.id === profileId) ?? standardsProfiles[0];
}

export function getCenteringStandardsBasis(
  profile: StandardsProfile,
  standard: CenterToleranceStandard = profile.defaultCenterToleranceStandard
) {
  return profile.centeringStandardsBases[standard] ?? profile.centeringStandardsBases[profile.defaultCenterToleranceStandard];
}

export function validateCenteringStandardsBasis(
  profile: StandardsProfile,
  standard: CenterToleranceStandard = profile.defaultCenterToleranceStandard
) {
  const issues: ValidationIssue[] = [];
  const basis = getCenteringStandardsBasis(profile, standard);

  const requiredMetadata: [keyof typeof basis, string][] = [
    ['displayLabel', 'ISO 1328 display label is required.'],
    ['standardCode', 'ISO 1328 standard code is required.'],
    ['standardTitle', 'ISO 1328 standard title is required.'],
    ['standardEdition', 'ISO 1328 standard edition is required.'],
    ['quantityName', 'Centering quantity name is required.'],
    ['quantitySymbol', 'Centering quantity symbol is required.'],
    ['quantityReference', 'Centering quantity reference note is required.'],
    ['clauseReference', 'Centering standards clause reference is required.'],
    ['sourceReference', 'ISO 1328 source reference is required.'],
    ['sourceUrl', 'ISO 1328 source URL is required.'],
    ['measurementMethodLabel', 'Centering measurement method label is required.'],
    ['measurementMethodNote', 'Centering measurement method note is required.'],
    ['engineeringAcceptanceNote', 'ISO 1328 engineering acceptance note is required.']
  ];

  requiredMetadata.forEach(([key, message]) => {
    if (typeof basis[key] !== 'string' || (basis[key] as string).trim().length === 0) {
      issues.push({
        code: 'incomplete-centering-standards-metadata',
        severity: 'error',
        message
      });
    }
  });

  if (!profile.centeringStandardsBases[profile.defaultCenterToleranceStandard]) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'The standards profile must identify a default centering standards basis.'
    });
  }

  const finiteOrderedRanges: Array<[number, number, string]> = [
    [basis.applicability.toothCount.min, basis.applicability.toothCount.max, 'ISO 1328 tooth-count applicability must be finite and strictly ordered.'],
    [basis.applicability.referenceDiameterMm.min, basis.applicability.referenceDiameterMm.max, 'ISO 1328 reference-diameter applicability must be finite and strictly ordered.'],
    [basis.applicability.normalModuleMm.min, basis.applicability.normalModuleMm.max, 'ISO 1328 normal-module applicability must be finite and strictly ordered.'],
    [basis.applicability.faceWidthMm.min, basis.applicability.faceWidthMm.max, 'ISO 1328 face-width applicability must be finite and strictly ordered.']
  ];

  finiteOrderedRanges.forEach(([min, max, message]) => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      issues.push({
        code: 'incomplete-centering-standards-metadata',
        severity: 'error',
        message
      });
    }
  });

  if (!Number.isFinite(basis.applicability.helixAngleAbsDeg.max) || basis.applicability.helixAngleAbsDeg.max <= 0) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'ISO 1328 helix-angle applicability metadata must be finite and greater than zero.'
    });
  }

  for (let index = 1; index < basis.classNumbers.length; index += 1) {
    if (basis.classNumbers[index] <= basis.classNumbers[index - 1]) {
      issues.push({
        code: 'incomplete-centering-standards-metadata',
        severity: 'error',
        message: 'ISO 1328 flank tolerance classes must be strictly increasing.'
      });
      break;
    }
  }

  if (basis.classNumbers.length !== 11) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'ISO 1328 released workflow must expose all 11 flank tolerance classes.'
    });
  }

  if (basis.validation.status === 'disabled') {
    issues.push({
      code: 'centering-standards-basis-disabled',
      severity: 'error',
      message: `${basis.standardCode} is disabled in the shipped app and cannot be used for released centering calculations.`
    });
  } else if (basis.validation.status === 'provisional') {
    issues.push({
      code: 'centering-standards-basis-unapproved',
      severity: 'warning',
      message:
        'The selected centering standards basis remains provisional. The app may report the standards quantity, but release stays blocked until the approved internal extract is signed off.'
    });
  }

  if (!basis.formula) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: basis.validation.status === 'disabled' ? 'warning' : 'error',
      message: 'The selected centering standards basis must provide a formula definition before it can be calculated.'
    });
    return issues;
  }

  if (typeof basis.formula.expression !== 'string' || basis.formula.expression.trim().length === 0) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'The selected centering standards basis must provide a formula expression.'
    });
  }

  const formula = basis.formula;
  const requiredPositiveFormulaValues: Array<[number, string]> = [
    [formula.runoutFactor, 'ISO 1328 runout factor must be finite and greater than zero.'],
    [formula.sqrtReferenceDiameterCoeff, 'ISO 1328 sqrt(reference diameter) coefficient must be finite and greater than zero.'],
    [formula.normalModuleCoeff, 'ISO 1328 normal-module coefficient must be finite and greater than zero.'],
    [formula.constant, 'ISO 1328 constant term must be finite and greater than zero.'],
    [formula.classFactorBase, 'ISO 1328 class-factor base must be finite and greater than zero.']
  ];

  requiredPositiveFormulaValues.forEach(([value, message]) => {
    if (!Number.isFinite(value) || value <= 0) {
      issues.push({
        code: 'incomplete-centering-standards-metadata',
        severity: 'error',
        message
      });
    }
  });

  if (!Number.isFinite(formula.referenceDiameterCoeff) || formula.referenceDiameterCoeff < 0) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'ISO 1328 reference-diameter coefficient must be finite and non-negative.'
    });
  }

  if (!Number.isFinite(formula.classFactorReferenceClass)) {
    issues.push({
      code: 'incomplete-centering-standards-metadata',
      severity: 'error',
      message: 'ISO 1328 reference class must be finite.'
    });
  }

  return issues;
}

export function validateIso1328RunoutProfile(profile: StandardsProfile) {
  return validateCenteringStandardsBasis(profile, profile.defaultCenterToleranceStandard);
}
