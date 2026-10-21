import React from 'react';
import type { CylinderState, DynoCurve, PvPoint } from './engineDynamics';
import type { CyclePhase } from './types';

const PHASE_COLOR: Record<CyclePhase, string> = {
  intake: '#0ea5e9',
  compression: '#8b5cf6',
  power: '#f97316',
  exhaust: '#78716c',
  'n/a': '#a8a29e',
};

const PHASE_LABEL: Record<CyclePhase, string> = {
  intake: 'Intake',
  compression: 'Compression',
  power: 'Power',
  exhaust: 'Exhaust',
  'n/a': '—',
};

function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function buildPolyline(
  points: { x: number; y: number }[]
): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

interface DynoChartProps {
  curve: DynoCurve;
  rpm: number;
  torqueNm: number;
  height?: number;
}

/** Combined torque/power dyno plot with the live operating point marked. */
export const DynoChart: React.FC<DynoChartProps> = ({ curve, rpm, torqueNm, height = 148 }) => {
  const width = 320;
  const pad = { left: 30, right: 32, top: 10, bottom: 20 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const hasCurve = curve.points.length > 1 && curve.redlineRpm > 0;

  const torqueMax = niceMax(Math.max(curve.peakTorqueNm, torqueNm) * 1.08);
  const powerMax = niceMax(Math.max(curve.peakPowerKw, 1) * 1.08);

  const xFor = (value: number) =>
    pad.left + (Math.max(0, Math.min(curve.redlineRpm, value)) / Math.max(1, curve.redlineRpm)) * plotW;
  const yTorque = (value: number) => pad.top + plotH - (value / torqueMax) * plotH;
  const yPower = (value: number) => pad.top + plotH - (value / powerMax) * plotH;

  const torquePoints = curve.points.map((point) => ({
    x: xFor(point.rpm),
    y: yTorque(point.torqueNm),
  }));
  const powerPoints = curve.points.map((point) => ({
    x: xFor(point.rpm),
    y: yPower(point.powerKW),
  }));

  const liveX = xFor(rpm);
  const liveY = yTorque(torqueNm);

  const torqueTicks = [0, torqueMax / 2, torqueMax];
  const rpmTicks = [0, curve.redlineRpm / 2, curve.redlineRpm];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2">
      <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
        <span className="text-amber-700">Torque · N·m</span>
        <span className="text-blue-700">Power · kW</span>
      </div>
      {hasCurve ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Dyno curve from idle to ${curve.redlineRpm} rpm. Peak torque ${curve.peakTorqueNm.toFixed(0)} newton metres and peak power ${curve.peakPowerKw.toFixed(0)} kilowatts.`}
        >
          <defs>
            <linearGradient id="torqueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {torqueTicks.map((tick, index) => (
            <g key={`t-${index}`}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={yTorque(tick)}
                y2={yTorque(tick)}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              <text
                x={pad.left - 5}
                y={yTorque(tick) + 3}
                textAnchor="end"
                fontSize="7"
                fill="#a8a29e"
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}

          {rpmTicks.map((tick, index) => (
            <text
              key={`r-${index}`}
              x={xFor(tick)}
              y={height - 5}
              textAnchor={index === 0 ? 'start' : index === rpmTicks.length - 1 ? 'end' : 'middle'}
              fontSize="7"
              fill="#a8a29e"
              fontFamily="ui-monospace, monospace"
            >
              {(tick / 1000).toFixed(1)}k
            </text>
          ))}

          <path
            d={`${buildPolyline(torquePoints)} L${xFor(curve.redlineRpm)},${pad.top + plotH} L${pad.left},${pad.top + plotH} Z`}
            fill="url(#torqueFill)"
          />
          <path d={buildPolyline(torquePoints)} fill="none" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
          <path d={buildPolyline(powerPoints)} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />

          <line
            x1={liveX}
            x2={liveX}
            y1={pad.top}
            y2={pad.top + plotH}
            stroke="#1c1917"
            strokeDasharray="2 3"
            strokeWidth="1"
            opacity="0.35"
          />
          <circle cx={liveX} cy={liveY} r="3.5" fill="#d97706" stroke="#fff" strokeWidth="1.5" />
          <circle
            cx={xFor(rpm)}
            cy={yPower((curve.points.find((point) => point.rpm >= rpm)?.powerKW ?? 0))}
            r="3"
            fill="#2563eb"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </svg>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg bg-stone-50 text-[10px] font-bold text-stone-400">
          Dyno sweep applies to reciprocating and electric machines.
        </div>
      )}
      {hasCurve ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[9px] font-bold text-stone-500">
          <span>
            Peak torque{' '}
            <span className="font-mono text-stone-800">{curve.peakTorqueNm.toFixed(0)} N·m</span> @{' '}
            {Math.round(curve.peakTorqueRpm).toLocaleString()}
          </span>
          <span>
            Peak power{' '}
            <span className="font-mono text-stone-800">{curve.peakPowerKw.toFixed(0)} kW</span> @{' '}
            {Math.round(curve.peakPowerRpm).toLocaleString()}
          </span>
        </div>
      ) : null}
    </div>
  );
};

interface PvLoopChartProps {
  points: PvPoint[];
  crankAngleRad: number;
  height?: number;
}

/** 720-degree P-V diagram with the live crank position highlighted. */
export const PvLoopChart: React.FC<PvLoopChartProps> = ({ points, crankAngleRad, height = 148 }) => {
  const width = 320;
  const pad = { left: 30, right: 10, top: 10, bottom: 20 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVolume = Math.max(1, ...points.map((point) => point.volumeCc));
  const maxPressure = Math.max(1, ...points.map((point) => point.pressureBar));

  const xFor = (value: number) => pad.left + (value / maxVolume) * plotW;
  const yFor = (value: number) =>
    pad.top + plotH - (Math.log10(1 + value) / Math.log10(1 + maxPressure)) * plotH;

  const segments: { phase: CyclePhase; path: string }[] = [];
  let current: { phase: CyclePhase; points: { x: number; y: number }[] } | null = null;
  for (const point of points) {
    const projected = { x: xFor(point.volumeCc), y: yFor(point.pressureBar) };
    if (!current || current.phase !== point.phase) {
      if (current && current.points.length > 1) {
        segments.push({ phase: current.phase, path: buildPolyline(current.points) });
      }
      const carry: { x: number; y: number }[] = current
        ? [current.points[current.points.length - 1], projected]
        : [projected];
      current = { phase: point.phase, points: carry };
    } else {
      current.points.push(projected);
    }
  }
  if (current && current.points.length > 1) {
    segments.push({ phase: current.phase, path: buildPolyline(current.points) });
  }

  const angle = ((crankAngleRad * 180) / Math.PI) % 720;
  const index = Math.round((angle / 720) * Math.max(0, points.length - 1));
  const live = points[Math.max(0, Math.min(points.length - 1, index))];

  if (!points.length) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-2">
        <div className="flex h-24 items-center justify-center rounded-lg bg-stone-50 text-[10px] font-bold text-stone-400">
          P-V diagram applies to reciprocating engines.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2">
      <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
        <span className="text-stone-700">P-V Diagram</span>
        <span className="font-mono text-stone-400">{maxPressure.toFixed(0)} bar peak</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Cylinder pressure versus volume over the complete 720 degree four-stroke cycle."
      >
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={pad.left}
            x2={pad.left + plotW}
            y1={pad.top + plotH * (1 - fraction)}
            y2={pad.top + plotH * (1 - fraction)}
            stroke="#e7e5e4"
            strokeWidth="1"
          />
        ))}

        {segments.map((segment, segmentIndex) => (
          <path
            key={`${segment.phase}-${segmentIndex}`}
            d={segment.path}
            fill="none"
            stroke={PHASE_COLOR[segment.phase]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {live ? (
          <>
            <circle
              cx={xFor(live.volumeCc)}
              cy={yFor(live.pressureBar)}
              r="4"
              fill={PHASE_COLOR[live.phase]}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text
              x={xFor(live.volumeCc) + 6}
              y={yFor(live.pressureBar) - 3}
              fontSize="7"
              fill="#44403c"
              fontWeight="700"
            >
              {live.pressureBar.toFixed(1)} bar
            </text>
          </>
        ) : null}

        <text x={pad.left} y={height - 5} fontSize="7" fill="#a8a29e">
          TDC
        </text>
        <text x={pad.left + plotW} y={height - 5} fontSize="7" fill="#a8a29e" textAnchor="end">
          BDC
        </text>
        <text
          x={pad.left - 5}
          y={pad.top + 4}
          fontSize="7"
          fill="#a8a29e"
          textAnchor="end"
          fontFamily="ui-monospace, monospace"
        >
          {maxPressure.toFixed(0)}
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] font-bold text-stone-500">
        {(['intake', 'compression', 'power', 'exhaust'] as CyclePhase[]).map((phase) => (
          <span key={phase} className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: PHASE_COLOR[phase] }}
            />
            {PHASE_LABEL[phase]}
          </span>
        ))}
      </div>
    </div>
  );
};

interface CylinderGridProps {
  states: CylinderState[];
}

/** Per-cylinder phase and pressure overview for the current crank angle. */
export const CylinderGrid: React.FC<CylinderGridProps> = ({ states }) => {
  if (!states.length) return null;
  const maxPressure = Math.max(1, ...states.map((state) => state.pressureBar));
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2">
      <div className="mb-1.5 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
        <span className="text-stone-700">Cylinder Pressure</span>
        <span className="text-stone-400">Live · 720°</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {states.map((state) => (
          <div
            key={state.index}
            className="rounded-lg border border-stone-100 bg-stone-50/80 px-1.5 py-1"
          >
            <div className="flex items-center justify-between text-[9px] font-black">
              <span className="text-stone-700">CYL {state.index}</span>
              <span style={{ color: PHASE_COLOR[state.phase] }}>
                {state.phase === 'power' ? 'POWER' : PHASE_LABEL[state.phase].toUpperCase()}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200">
                <span
                  className="block h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${(state.pressureBar / maxPressure) * 100}%`,
                    backgroundColor: PHASE_COLOR[state.phase],
                  }}
                />
              </span>
              <span className="w-10 text-right font-mono text-[8px] font-bold text-stone-500">
                {state.pressureBar.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { PHASE_COLOR, PHASE_LABEL };
