import type { RobotDefinition } from '../schema/robotSchema';
import catalogJson from './robotsCatalog.json';
import pumaJson from './Puma560.json';
import kukaJson from './KukaKR5.json';
import abbJson from './ABBIRB120.json';
import stanfordJson from './Stanford.json';
import skeleton3RJson from './skeleton_3R.json';
import skeletonSCARAJson from './skeleton_SCARA.json';

export interface RobotCatalogEntry {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  dof: number;
  dhConvention: string;
}

export const ROBOTS_CATALOG: RobotCatalogEntry[] = catalogJson as unknown as RobotCatalogEntry[];

// Pre-bundled popular robots for instant zero-latency switching
const BUNDLED_ROBOTS: Record<string, RobotDefinition> = {
  Puma560: pumaJson as unknown as RobotDefinition,
  KukaKR5: kukaJson as unknown as RobotDefinition,
  ABBIRB120: abbJson as unknown as RobotDefinition,
  Stanford: stanfordJson as unknown as RobotDefinition,
  skeleton_3R: skeleton3RJson as unknown as RobotDefinition,
  skeleton_SCARA: skeletonSCARAJson as unknown as RobotDefinition,
};

// Dynamic glob for remaining robots in the library (excluding statically bundled robots and assets)
const robotModules = import.meta.glob([
  './*.json',
  '!./robotsCatalog.json',
  '!./thanksTrajectory.json',
  '!./Puma560.json',
  '!./KukaKR5.json',
  '!./ABBIRB120.json',
  '!./Stanford.json',
  '!./skeleton_3R.json',
  '!./skeleton_SCARA.json',
]);

export async function loadRobotById(id: string): Promise<RobotDefinition> {
  if (BUNDLED_ROBOTS[id]) {
    return BUNDLED_ROBOTS[id];
  }

  // Check bundled robots case-insensitively
  const normalizedTarget = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bundledKey = Object.keys(BUNDLED_ROBOTS).find(
    (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget
  );
  if (bundledKey && BUNDLED_ROBOTS[bundledKey]) {
    return BUNDLED_ROBOTS[bundledKey];
  }

  const modulePath = `./${id}.json`;
  if (robotModules[modulePath]) {
    const mod = (await robotModules[modulePath]()) as { default: RobotDefinition };
    return mod.default;
  }

  // Check dynamic glob case-insensitively
  const matchedModuleKey = Object.keys(robotModules).find((k) => {
    const cleanKey = k.replace('./', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanKey === normalizedTarget;
  });

  if (matchedModuleKey && robotModules[matchedModuleKey]) {
    const mod = (await robotModules[matchedModuleKey]()) as { default: RobotDefinition };
    return mod.default;
  }

  throw new Error(`Robot definition not found for ID: ${id}`);
}

export function getDefaultRobot(): RobotDefinition {
  return BUNDLED_ROBOTS['Puma560'];
}
