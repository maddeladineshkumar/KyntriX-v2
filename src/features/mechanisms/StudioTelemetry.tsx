import React from 'react';
import { Activity, Flame, Move3d } from 'lucide-react';
import type { EngineType, SimulationTelemetry, ViewerState } from './types';
import { calculateTelemetry } from './telemetryEngine';
import { isFlightTestbed, isShaftEngine } from './studioConfig';
import { cx } from './studioUtils';

type NumericTelemetryKey = {
  [K in keyof SimulationTelemetry]: SimulationTelemetry[K] extends number ? K : never;
}[keyof SimulationTelemetry];

type Tone = 'stone' | 'amber' | 'emerald' | 'blue' | 'orange';

interface Metric {
  key: NumericTelemetryKey;
  label: string;
  unit: string;
  max?: number;
  tone?: Tone;
  format?: (value: number) => string;
}

const TONE_BAR: Record<Tone, string> = {
  stone: 'bg-stone-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
};

const TONE_TEXT: Record<Tone, string> = {
  stone: 'text-stone-900',
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  blue: 'text-blue-700',
  orange: 'text-orange-700',
};

const formatInteger = (value: number) => Math.round(value).toLocaleString();
const formatOne = (value: number) => value.toFixed(1);
const formatTwo = (value: number) => value.toFixed(2);

function metricsFor(engine: EngineType): Metric[] {
  if (engine === 'bldc-motor') {
    return [
      { key: 'rpm', label: 'Motor RPM', unit: 'rpm', max: 4500, format: formatInteger },
      { key: 'torqueNm', label: 'Joint Torque', unit: 'N·m', max: 125, tone: 'amber', format: formatOne },
      { key: 'powerKW', label: 'Mechanical Power', unit: 'kW', max: 20, tone: 'blue', format: formatOne },
      { key: 'thermalEfficiencyPct', label: 'Drive Efficiency', unit: '%', max: 100, tone: 'emerald', format: formatOne },
    ];
  }

  if (engine === 'v8' || engine === 'inline4' || engine === 'rotary') {
    const maxPower = engine === 'v8' ? 380 : engine === 'inline4' ? 230 : 200;
    const maxTorque = engine === 'v8' ? 550 : engine === 'inline4' ? 410 : 230;
    const maxRpm = engine === 'v8' ? 7600 : engine === 'inline4' ? 6900 : 9600;
    return [
      { key: 'rpm', label: 'Crank RPM', unit: 'rpm', max: maxRpm, format: formatInteger },
      { key: 'torqueNm', label: 'Output Torque', unit: 'N·m', max: maxTorque, tone: 'amber', format: formatOne },
      { key: 'powerKW', label: 'Brake Power', unit: 'kW', max: maxPower, tone: 'blue', format: formatOne },
      { key: 'thermalEfficiencyPct', label: 'Thermal Efficiency', unit: '%', max: 100, tone: 'emerald', format: formatOne },
      { key: 'fuelFlowKgPerS', label: 'Fuel Flow', unit: 'kg/s', format: (value) => value.toFixed(3) },
      { key: 'compressionRatio', label: 'Compression Ratio', unit: ': 1', max: 14, format: formatOne },
    ];
  }

  if (isShaftEngine(engine)) {
    return [
      { key: 'rpm', label: 'Gas Generator RPM', unit: 'rpm', max: 25000, format: formatInteger },
      { key: 'powerKW', label: 'Shaft Power', unit: 'kW', max: engine === 'turboprop' ? 4000 : 2100, tone: 'blue', format: formatInteger },
      { key: 'torqueNm', label: 'Output Torque', unit: 'N·m', max: engine === 'turboprop' ? 36000 : 3400, tone: 'amber', format: formatInteger },
      { key: 'turbineInletTempC', label: 'Turbine Inlet', unit: '°C', max: 1800, tone: 'orange', format: formatInteger },
      { key: 'thermalEfficiencyPct', label: 'Thermal Efficiency', unit: '%', max: 100, tone: 'emerald', format: formatOne },
      { key: 'fuelFlowKgPerS', label: 'Fuel Flow', unit: 'kg/s', format: (value) => value.toFixed(3) },
    ];
  }

  const isJet = isFlightTestbed(engine);
  return [
    { key: 'rpm', label: 'Spool RPM', unit: 'rpm', max: 18000, format: formatInteger },
    { key: 'thrustKN', label: 'Net Thrust', unit: 'kN', max: engine === 'turbofan' ? 330 : 300, tone: 'amber', format: formatOne },
    { key: 'turbineInletTempC', label: 'Turbine Inlet', unit: '°C', max: 1800, tone: 'orange', format: formatInteger },
    { key: 'exhaustGasTempC', label: 'Exhaust Gas', unit: '°C', max: 1250, format: formatInteger },
    ...(isJet
      ? [
          { key: 'airspeedMach' as const, label: 'Airspeed', unit: 'Mach', max: 2.6, tone: 'blue' as const, format: formatTwo },
          { key: 'thermalEfficiencyPct' as const, label: 'Thermal Efficiency', unit: '%', max: 100, tone: 'emerald' as const, format: formatOne },
          { key: 'compressionRatio' as const, label: 'Overall Pressure', unit: ': 1', max: 46, format: formatOne },
        ]
      : []),
  ];
}

interface StudioTelemetryProps {
  engine: EngineType;
  state: ViewerState;
  elapsed: number;
  compact?: boolean;
}

export const StudioTelemetry: React.FC<StudioTelemetryProps> = ({
  engine,
  state,
  elapsed,
  compact = false,
}) => {
  const telemetry = calculateTelemetry(engine, state, elapsed);
  const metrics = metricsFor(engine);

  return (
    <div className="space-y-3" aria-label="Live physics telemetry">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-800">
          <Activity className="h-3.5 w-3.5 text-amber-600" /> Live Physics Telemetry
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className={cx('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        {metrics.map((metric) => {
          const value = telemetry[metric.key];
          const tone = metric.tone ?? 'stone';
          const percentage =
            metric.max && metric.max > 0
              ? Math.max(0, Math.min(100, (value / metric.max) * 100))
              : null;
          return (
            <div
              key={metric.key}
              className="rounded-xl border border-stone-200/80 bg-stone-50 p-2"
            >
              <span className="block truncate text-[10px] font-bold text-stone-500">{metric.label}</span>
              <span className={cx('block truncate font-mono text-sm font-black', TONE_TEXT[tone])}>
                {metric.format ? metric.format(value) : value}
                <span className="ml-1 text-[9px] font-bold text-stone-400">{metric.unit}</span>
              </span>
              {percentage !== null ? (
                <span
                  className="mt-1 block h-1 overflow-hidden rounded-full bg-stone-200"
                  role="presentation"
                >
                  <span
                    className={cx('block h-full rounded-full transition-[width] duration-200', TONE_BAR[tone])}
                    style={{ width: `${percentage}%` }}
                  />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
          Throttle {telemetry.throttlePct}%
        </span>
        {isFlightTestbed(engine) || isShaftEngine(engine) ? (
          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
            Alt {(telemetry.altitudeMeters / 1000).toFixed(1)} km
          </span>
        ) : null}
        {telemetry.afterburnerActive ? (
          <span className="flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
            <Flame className="h-3 w-3" /> Reheat
          </span>
        ) : null}
        {telemetry.vectoringAngleDeg !== 0 ? (
          <span className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
            <Move3d className="h-3 w-3" /> Vector {telemetry.vectoringAngleDeg > 0 ? '+' : ''}
            {Math.round(telemetry.vectoringAngleDeg)}°
          </span>
        ) : null}
      </div>

      <p className="text-[10px] leading-relaxed text-stone-500">
        Values are a real-time thermodynamic estimate driven by throttle, altitude, and reheat,
        not a certification-grade engine model.
      </p>
    </div>
  );
};
