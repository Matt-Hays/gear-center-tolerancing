import { getPathway, getRequiredKeys } from '@/data/measurementCatalog';
import type {
  GearFamily,
  MeasurementKey,
  NormalizedMeasurementSet,
  PathwayId,
  ShaftInterface,
  ValidationIssue
} from '@/types/domain';

export interface PathwayResolution {
  pathwayId: PathwayId;
  missingMeasurements: MeasurementKey[];
  issues: ValidationIssue[];
}

export function resolvePathwayRequirements(
  pathwayId: PathwayId,
  gearFamily: GearFamily,
  shaftInterface: ShaftInterface,
  measurements: NormalizedMeasurementSet
): PathwayResolution {
  const pathway = getPathway(pathwayId);
  const issues: ValidationIssue[] = [];
  const missingMeasurements = getRequiredKeys(pathwayId, gearFamily, shaftInterface).filter(
    (key) => measurements[key] === undefined
  );

  pathway.oneOfGroups?.forEach((group) => {
    const hasAny = group.some((key) => measurements[key] !== undefined);
    if (!hasAny) {
      issues.push({
        code: `one-of-${group.join('-')}`,
        severity: 'error',
        message: `One of ${group.join(', ')} is required for the selected pathway.`
      });
      missingMeasurements.push(group[0]);
    }
  });

  return {
    pathwayId: pathway.id,
    missingMeasurements: Array.from(new Set(missingMeasurements)),
    issues
  };
}
