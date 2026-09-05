/**
 * Authoritative numerical tolerances and physical constants for the robotics engine.
 * Units: SI (meters, radians, seconds)
 */
export const POSITION_TOLERANCE = 1e-4; // 0.1 mm in meters
export const ORIENTATION_TOLERANCE = 1e-3; // ~0.057 degrees in radians
export const MATRIX_TOLERANCE = 1e-6;
export const SINGULARITY_THRESHOLD = 1e-3;
export const IK_CONVERGENCE_TOLERANCE = 1e-5;
export const EPSILON = 1e-9;

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export const MM_TO_M = 1e-3;
export const M_TO_MM = 1e3;
