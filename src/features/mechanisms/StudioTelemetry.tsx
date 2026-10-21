import React, { useMemo } from 'react';
import { Activity, Flame, Gauge, Move3d, TriangleAlert, Zap } from 'lucide-react';
import type { EngineType, SimulationTelemetry, ViewerState } from './types';
import { calculateTelemetry } from './telemetryEngine';
import { getCylinderStates, getDynoCurve, getPvLoop, isBoostedSi } from './engineDynamics';
import { CylinderGrid, DynoChart, PvLoopChart } from './StudioDynoChart';
import { isElectric, isFlightTestbed, isPiston, isShaftEngine } from './studioConfig';
import { cx } from './studioUtils';

type NumericTelemetryKey = {
  [K in keyof SimulationTelemetry]: SimulationTelemetry[K] extends number ? K : never;
}[keyof SimulationTelemetry];

type Tone = 'stone' | 'amber' | 'emerald' | 'blue' | 'orange' | 'violet';

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
  violet: 'bg-violet-500',
};

const TONE_TEXT: Record<Tone, string> = {
  stone: 'text-stone-900',
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  blue: 'text-blue-700',
  orange: 'text-orange-700',
  violet: 'text-violet-700',
};

const formatInteger = (value: number) => Math.round(value).toLocaleString();
const formatOne = (value: number) => value.toFixed(1);
const formatTwo = (value: number) => value.toFixed(2);

const ENGINE_LIMITS: Partial<
  Record<EngineType, { torque: number; power: number; rpm: number }>
> = {
  v8: { torque: 550, power: 380, rpm: 7600 },
  v12: { torque: 760, power: 610, rpm: 8800 },
  flat6: { torque: 500, power: 395, rpm: 9100 },
  inline4: { torque: 410, power: 230, rpm: 6900 },
  'ea888-b8': { torque: 360, power: 165, rpm: 6900 },
  b58: { torque: 520, power: 295, rpm: 7100 },
  rotary: { torque: 230, power: 200, rpm: 9600 },
  'bldc-motor': { torque: 125, power: 20, rpm: 4500 },
  'axial-flux-motor': { torque: 510, power: 255, rpm: 12000 },
  'induction-motor': { torque: 360, power: 205, rpm: 14000 },
  'stepper-motor': { torque: 9, power: 1.6, rpm: 1500 },
};

function siMetrics(engine: EngineType): Metric[] {
  const limits = ENGINE_LIMITS[engine] ?? { torque: 500, power: 300, rpm: 7000 };
  const metrics: Metric[] = [
    { key: 'rpm', label: 'Crank RPM', unit: 'rpm', max: limits.rpm, format: formatInteger },
    { key: 'torqueNm', label: 'Brake Torque', unit: 'N·m', max: limits.torque, tone: 'amber', format: formatOne },
    { key: 'powerKW', label: 'Brake Power', unit: 'kW', max: limits.power, tone: 'blue', format: formatOne },
    { key: 'thermalEfficiencyPct', label: 'Brake Efficiency', unit: '%', max: 45, tone: 'emerald', format: formatOne },
  ];
  if (isBoostedSi(engine)) {
    metrics.push({
      key: 'boostBar',
      label: 'Boost Pressure',
      unit: 'bar',
      max: engine === 'b58' ? 1.4 : engine === 'inline4' ? 1.5 : 1.3,
      tone: 'violet',
      format: formatTwo,
    });
  }
  metrics.push(
    { key: 'lambda', label: 'Lambda', unit: 'λ', max: 1.1, tone: 'orange', format: formatTwo },
    { key: 'sparkAdvanceDeg', label: 'Spark Advance', unit: '° BTDC', max: 45, format: formatOne },
    { key: 'bmepKpa', label: 'BMEP', unit: 'kPa', max: 2200, tone: 'stone', format: (value) => Math.round(value).toLocaleString() },
    { key: 'volumetricEfficiencyPct', label: 'Volumetric Eff.', unit: '%', max: 120, tone: 'blue', format: formatOne }
  );
  return metrics;
}

function electricMetrics(engine: EngineType): Metric[] {
  const limits = ENGINE_LIMITS[engine] ?? { torque: 500, power: 250, rpm: 12000 };
  const metrics: Metric[] = [
    { key: 'rpm', label: 'Rotor Speed', unit: 'rpm', max: limits.rpm, format: formatInteger },
    { key: 'torqueNm', label: 'Shaft Torque', unit: 'N·m', max: limits.torque, tone: 'amber', format: formatOne },
    { key: 'powerKW', label: 'Mechanical Power', unit: 'kW', max: limits.power, tone: 'blue', format: formatOne },
    { key: 'thermalEfficiencyPct', label: 'Drive Efficiency', unit: '%', max: 100, tone: 'emerald', format: formatOne },
    { key: 'electricalPowerKW', label: 'Electrical Input', unit: 'kW', max: limits.power * 1.1, tone: 'violet', format: formatOne },
    { key: 'currentA', label: 'Bus Current', unit: 'A', max: engine === 'stepper-motor' ? 12 : engine === 'bldc-motor' ? 480 : 720, tone: 'orange', format: formatInteger },
    { key: 'voltageV', label: 'Bus Voltage', unit: 'V', max: engine === 'stepper-motor' || engine === 'bldc-motor' ? 48 : 400, tone: 'blue', format: formatOne },
  ];
  if (engine === 'induction-motor') {
    metrics.push({ key: 'slipPct', label: 'Rotor Slip', unit: '%', max: 3, tone: 'violet', format: formatTwo });
  }
  metrics.push({ key: 'coolantTempC', label: 'Winding Temp.', unit: '°C', max: 130, tone: 'orange', format: formatInteger });
  return metrics;
}

function metricsFor(engine: EngineType): Metric[] {
  if (isPiston(engine)) return siMetrics(engine);
  if (isElectric(engine)) return electricMetrics(engine);

  if (engine === 'rotary') {
    return [
      { key: 'rpm', label: 'Eccentric Shaft RPM', unit: 'rpm', max: 9600, format: formatInteger },
      { key: 'torqueNm', label: 'Output Torque', unit: 'N·m', max: 230, tone: 'amber', format: formatOne },
      { key: 'powerKW', label: 'Brake Power', unit: 'kW', max: 200, tone: 'blue', format: formatOne },
      { key: 'thermalEfficiencyPct', label: 'Thermal Efficiency', unit: '%', max: 50, tone: 'emerald', format: formatOne },
      { key: 'turbineInletTempC', label: 'Chamber Temp.', unit: '°C', max: 1000, tone: 'orange', format: formatInteger },
      { key: 'fuelFlowKgPerS', label: 'Fuel Flow', unit: 'kg/s', format: (value) => value.toFixed(3) },
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

interface DetailItem {
  label: string;
  value: string;
  tone?: Tone;
}

function detailGroups(
  engine: EngineType,
  telemetry: SimulationTelemetry
): { title: string; items: DetailItem[] }[] {
  if (isPiston(engine)) {
    return [
      {
        title: 'Air & Fuel',
        items: [
          { label: 'Manifold', value: `${telemetry.manifoldPressureKpa.toFixed(0)} kPa` },
          { label: 'AFR', value: telemetry.afr > 0 ? `${telemetry.afr.toFixed(1)} : 1` : '—' },
          { label: 'Fuel flow', value: `${(telemetry.fuelFlowKgPerS * 3600).toFixed(1)} kg/h` },
          { label: 'Turbo speed', value: telemetry.turboRpm > 0 ? `${Math.round(telemetry.turboRpm / 100) / 10}k rpm` : '—' },
          { label: 'BSFC', value: telemetry.bsfcGPerKwh > 0 ? `${telemetry.bsfcGPerKwh.toFixed(0)} g/kWh` : '—' },
          { label: 'Intake air', value: `${telemetry.intakeAirTempC.toFixed(0)} °C` },
        ],
      },
      {
        title: 'Thermal & Health',
        items: [
          { label: 'Coolant', value: `${telemetry.coolantTempC} °C`, tone: telemetry.coolantTempC > 110 ? 'orange' : undefined },
          { label: 'Oil', value: `${telemetry.oilTempC} °C`, tone: telemetry.oilTempC > 130 ? 'orange' : undefined },
          { label: 'Exhaust gas', value: `${telemetry.exhaustGasTempC} °C` },
          { label: 'Knock', value: `${Math.round(telemetry.knockIntensity * 100)} %`, tone: telemetry.knockIntensity > 0.15 ? 'orange' : 'emerald' },
          { label: 'Compression', value: `${telemetry.compressionRatio.toFixed(1)} : 1` },
          { label: 'Cycle', value: telemetry.cyclePhase.toUpperCase(), tone: telemetry.cyclePhase === 'power' ? 'orange' : undefined },
        ],
      },
    ];
  }

  if (isElectric(engine)) {
    return [
      {
        title: 'Electrical',
        items: [
          { label: 'DC power', value: `${telemetry.electricalPowerKW.toFixed(1)} kW` },
          { label: 'Bus current', value: `${telemetry.currentA.toFixed(0)} A` },
          { label: 'Bus voltage', value: `${telemetry.voltageV.toFixed(0)} V` },
          { label: 'Slip', value: `${telemetry.slipPct.toFixed(2)} %` },
          { label: 'Losses', value: `${Math.max(0, telemetry.electricalPowerKW - telemetry.powerKW).toFixed(1)} kW` },
          { label: 'Efficiency', value: `${telemetry.thermalEfficiencyPct.toFixed(1)} %` },
        ],
      },
      {
        title: 'Thermal',
        items: [
          { label: 'Winding', value: `${telemetry.coolantTempC} °C`, tone: telemetry.coolantTempC > 110 ? 'orange' : undefined },
          { label: 'Rotor', value: `${telemetry.oilTempC} °C` },
          { label: 'Ambient', value: `${telemetry.intakeAirTempC} °C` },
          { label: 'Rotor field', value: engine === 'induction-motor' ? 'Induced' : engine === 'stepper-motor' ? 'PM + teeth' : 'Permanent magnet' },
          { label: 'Control', value: engine === 'stepper-motor' ? 'Microstep' : 'Field-oriented' },
          { label: 'Duty', value: `${telemetry.throttlePct} %` },
        ],
      },
    ];
  }

  if (isShaftEngine(engine) || isFlightTestbed(engine) || engine === 'rotary') {
    const isJet = isFlightTestbed(engine);
    return [
      {
        title: engine === 'rotary' ? 'Combustion & Sealing' : 'Flow & Combustion',
        items: [
          { label: 'Fuel flow', value: `${(telemetry.fuelFlowKgPerS * 3600).toFixed(0)} kg/h` },
          { label: 'Compression', value: `${telemetry.compressionRatio.toFixed(1)} : 1` },
          { label: 'Exhaust gas', value: `${telemetry.exhaustGasTempC} °C` },
          { label: 'Thermal eff.', value: `${telemetry.thermalEfficiencyPct.toFixed(1)} %` },
          { label: 'Altitude', value: `${(telemetry.altitudeMeters / 1000).toFixed(1)} km` },
          { label: 'Duty', value: `${telemetry.throttlePct} %` },
        ],
      },
      ...(isJet
        ? [
            {
              title: 'Propulsion',
              items: [
                { label: 'Net thrust', value: `${telemetry.thrustKN.toFixed(1)} kN` },
                { label: 'Airspeed', value: `Mach ${telemetry.airspeedMach.toFixed(2)}` },
                { label: 'Reheat', value: telemetry.afterburnerActive ? 'ACTIVE' : 'Off', tone: telemetry.afterburnerActive ? ('orange' as Tone) : undefined },
                { label: 'Vector', value: `${telemetry.vectoringAngleDeg.toFixed(0)}°` },
              ],
            },
          ]
        : []),
    ];
  }

  return [];
}

const DetailGroup: React.FC<{ title: string; items: DetailItem[] }> = ({ title, items }) => (
  <div className="rounded-xl border border-stone-200 bg-white p-2">
    <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-stone-500">
      {title}
    </span>
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <span className="block truncate text-[9px] font-bold text-stone-400">{item.label}</span>
          <span
            className={cx(
              'block truncate font-mono text-[10px] font-black',
              item.tone ? TONE_TEXT[item.tone] : 'text-stone-800'
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

interface StudioTelemetryProps {
  engine: EngineType;
  state: ViewerState;
  /** Live simulator snapshot. Falls back to the pure operating-point model. */
  telemetry?: SimulationTelemetry;
  crankAngleRad?: number;
  elapsed?: number;
  compact?: boolean;
}

export const StudioTelemetry: React.FC<StudioTelemetryProps> = ({
  engine,
  state,
  telemetry,
  crankAngleRad,
  elapsed = 0,
  compact = false,
}) => {
  const live = telemetry ?? calculateTelemetry(engine, state, elapsed);
  const metrics = metricsFor(engine);
  const piston = isPiston(engine);
  const electric = isElectric(engine);

  const dyno = useMemo(
    () => (piston || electric ? getDynoCurve(engine) : null),
    [engine, piston, electric]
  );
  const pv = useMemo(
    () => (piston ? getPvLoop(engine, live.rpm, live.throttlePct, live.altitudeMeters) : []),
    [engine, piston, live.rpm, live.throttlePct, live.altitudeMeters]
  );
  const cylinders = useMemo(
    () =>
      piston
        ? getCylinderStates(
            engine,
            live.rpm,
            live.throttlePct,
            live.altitudeMeters,
            crankAngleRad ?? (live.crankAngleDeg * Math.PI) / 180
          )
        : [],
    [engine, piston, live.rpm, live.throttlePct, live.altitudeMeters, live.crankAngleDeg, crankAngleRad]
  );
  const groups = useMemo(() => detailGroups(engine, live), [engine, live]);

  return (
    <div className="space-y-2.5" aria-label="Live physics telemetry">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-800">
          <Activity className="h-3.5 w-3.5 text-amber-600" /> Live Physics
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          240 Hz solve
        </span>
      </div>

      <div className={cx('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        {metrics.map((metric) => {
          const value = live[metric.key];
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
          Command {live.throttlePct}%
        </span>
        {piston ? (
          <span className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
            <Gauge className="h-3 w-3" /> {live.cyclePhase.toUpperCase()}
          </span>
        ) : null}
        {isFlightTestbed(engine) || isShaftEngine(engine) ? (
          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
            Alt {(live.altitudeMeters / 1000).toFixed(1)} km
          </span>
        ) : null}
        {live.afterburnerActive ? (
          <span className="flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
            <Flame className="h-3 w-3" /> Reheat
          </span>
        ) : null}
        {live.revLimiterActive ? (
          <span className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-700">
            <TriangleAlert className="h-3 w-3" /> Limiter
          </span>
        ) : null}
        {live.knockIntensity > 0.2 ? (
          <span className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
            <TriangleAlert className="h-3 w-3" /> Knock {Math.round(live.knockIntensity * 100)}%
          </span>
        ) : null}
        {live.slipPct > 0 ? (
          <span className="flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-black text-violet-700">
            <Zap className="h-3 w-3" /> Slip {live.slipPct.toFixed(1)}%
          </span>
        ) : null}
        {live.vectoringAngleDeg !== 0 ? (
          <span className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
            <Move3d className="h-3 w-3" /> Vector {live.vectoringAngleDeg > 0 ? '+' : ''}
            {Math.round(live.vectoringAngleDeg)}°
          </span>
        ) : null}
      </div>

      {dyno ? (
        <DynoChart
          curve={dyno}
          rpm={live.rpm}
          torqueNm={live.torqueNm}
        />
      ) : null}

      {groups.map((group) => (
        <DetailGroup key={group.title} title={group.title} items={group.items} />
      ))}

      {piston ? (
        <>
          <PvLoopChart points={pv} crankAngleRad={crankAngleRad ?? (live.crankAngleDeg * Math.PI) / 180} />
          <CylinderGrid states={cylinders} />
        </>
      ) : null}

      <p className="text-[10px] leading-relaxed text-stone-500">
        {piston
          ? 'Calibrated quasi-dimensional SI model: Wiebe-style heat release, boost and thermal dynamics, knock retard, and a 720° pressure trace. Educational, not certification-grade.'
          : electric
            ? 'Field-oriented machine model with torque-speed limits, copper and inverter losses, bus droop, and induction slip. Educational estimate.'
            : engine === 'rotary'
              ? 'Quasi-steady Wankel estimate with eccentric-shaft speed, chamber temperature, fuel flow, and thermal efficiency. Educational, not certification-grade.'
              : 'Real-time thermodynamic estimate driven by throttle, altitude, reheat, and spool dynamics. Not certification-grade.'}
      </p>
    </div>
  );
};
