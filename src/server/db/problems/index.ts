import type { Problem } from '../types';
import { unit1TransformsProblems } from './unit1_transforms';
import { unit2DhFkProblems } from './unit2_dh_fk';
import { unit2IkProblems } from './unit2_ik';
import { unit2JacobiansProblems } from './unit2_jacobians';
import { unit2MobileProblems } from './unit2_mobile';
import { unit3DynamicsProblems } from './unit3_dynamics';
import { unit3ControlProblems } from './unit3_control';
import { advancedTrajectoryProblems } from './advanced_trajectory';
import { advancedWorkspaceProblems } from './advanced_workspace';

export {
  unit1TransformsProblems,
  unit2DhFkProblems,
  unit2IkProblems,
  unit2JacobiansProblems,
  unit2MobileProblems,
  unit3DynamicsProblems,
  unit3ControlProblems,
  advancedTrajectoryProblems,
  advancedWorkspaceProblems,
};

export const allArenaProblems: Problem[] = [
  ...unit1TransformsProblems,
  ...unit2DhFkProblems,
  ...unit2IkProblems,
  ...unit2JacobiansProblems,
  ...unit2MobileProblems,
  ...unit3DynamicsProblems,
  ...unit3ControlProblems,
  ...advancedTrajectoryProblems,
  ...advancedWorkspaceProblems,
];
