/**
 * Backwards-compatible telemetry entry point.
 *
 * The calibrated SI, electric, and turbine models live in engineDynamics.ts.
 * This module re-exports the pure calculation so existing callers and tests
 * keep working without duplicating the physics.
 */
export {
  calculateTelemetry,
  atmosphereAt,
  siOperatingPoint,
  electricOperatingPoint,
  getDynoCurve,
  getPvLoop,
  getCylinderStates,
  EngineSimulator,
} from './engineDynamics';
export type {
  Atmosphere,
  SiEngineConfig,
  ElectricMachineConfig,
  SiOperatingPoint,
  ElectricOperatingPoint,
  DynoPoint,
  DynoCurve,
  PvPoint,
  CylinderState,
  SimulatorInputs,
} from './engineDynamics';
