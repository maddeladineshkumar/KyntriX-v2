import React, { useState } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { LineChart, Activity, Download, ArrowRight, Gauge, Clock, BarChart2, Crosshair } from 'lucide-react';

const PALETTE = [
  '#e11d48', // rose-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
];

export const AnalysisStudio: React.FC = () => {
  const { robot, activeTrajectory, playback, seekTrajectory, setActiveTab } = useRobotStore();
  const [metric, setMetric] = useState<'positions' | 'velocities' | 'accelerations' | 'ee-position' | 'dexterity'>('positions');

  if (!activeTrajectory) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#faf8f5] text-black select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-black mb-4 shadow-sm border-2 border-amber-300">
          <LineChart className="w-8 h-8 text-black" />
        </div>
        <h3 className="text-base font-black text-black mb-2 uppercase tracking-wide">No Active Trajectory Data</h3>
        <p className="text-xs text-black max-w-md mb-6 leading-relaxed font-medium">
          Run an interpolation in the Trajectory Studio to unlock dynamic time-series telemetry
          for joint positions, velocities, accelerations, Cartesian end-effector coordinates, and Yoshikawa dexterity.
        </p>
        <button
          onClick={() => setActiveTab('trajectory')}
          className="flex items-center gap-2.5 px-6 py-3 bg-amber-400 hover:bg-amber-500 active:scale-95 text-black font-black text-xs rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer uppercase tracking-wider"
        >
          <span>Open Trajectory Studio</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </button>
      </div>
    );
  }

  const { timeSteps, positions, velocities, accelerations, endEffectorPositions, manipulabilities, conditionNumbers, duration } = activeTrajectory;

  // Compute plot data based on selected metric
  let seriesData: { name: string; color: string; values: number[] }[] = [];
  let yLabel = '';

  if (metric === 'positions') {
    yLabel = 'Joint Angle (rad / m)';
    seriesData = robot.joints.map((joint, jIdx) => ({
      name: joint.name,
      color: PALETTE[jIdx % PALETTE.length],
      values: positions.map((p) => p[jIdx]),
    }));
  } else if (metric === 'velocities') {
    yLabel = 'Velocity (rad/s, m/s)';
    seriesData = robot.joints.map((joint, jIdx) => ({
      name: `d/dt ${joint.name}`,
      color: PALETTE[jIdx % PALETTE.length],
      values: velocities.map((v) => v[jIdx]),
    }));
  } else if (metric === 'accelerations') {
    yLabel = 'Acceleration (rad/s², m/s²)';
    seriesData = robot.joints.map((joint, jIdx) => ({
      name: `d²/dt² ${joint.name}`,
      color: PALETTE[jIdx % PALETTE.length],
      values: accelerations.map((a) => a[jIdx]),
    }));
  } else if (metric === 'ee-position') {
    yLabel = 'End-Effector Position (m)';
    seriesData = [
      { name: 'EE X(t)', color: '#e11d48', values: (endEffectorPositions || []).map((p) => p.x) },
      { name: 'EE Y(t)', color: '#059669', values: (endEffectorPositions || []).map((p) => p.y) },
      { name: 'EE Z(t)', color: '#d97706', values: (endEffectorPositions || []).map((p) => p.z) },
    ];
  } else {
    yLabel = 'Dexterity Metric';
    seriesData = [
      { name: 'Yoshikawa Manipulability w', color: '#059669', values: manipulabilities },
      { name: 'Condition Number κ (log10)', color: '#d97706', values: conditionNumbers.map((c) => Math.log10(Math.max(1, c))) },
    ];
  }

  // Find min and max across all series
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of seriesData) {
    for (const v of s.values) {
      if (Number.isFinite(v)) {
        minY = Math.min(minY, v);
        maxY = Math.max(maxY, v);
      }
    }
  }

  // Add margin
  const yRange = maxY - minY || 1;
  const plotMinY = minY - yRange * 0.1;
  const plotMaxY = maxY + yRange * 0.1;

  // SVG dimensions
  const svgWidth = 720;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const scaleX = (t: number) => padding.left + (t / duration) * graphWidth;
  const scaleY = (v: number) =>
    padding.top + graphHeight - ((v - plotMinY) / (plotMaxY - plotMinY)) * graphHeight;

  // Scrubber X
  const scrubberX = scaleX(playback.currentTime);

  // Current time index for value readout
  const ratio = Math.max(0, Math.min(1, duration > 0 ? playback.currentTime / duration : 0));
  const currentIndex = timeSteps.length > 0
    ? Math.min(Math.round(ratio * (timeSteps.length - 1)), timeSteps.length - 1)
    : 0;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = (clickX - padding.left) / graphWidth;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    seekTrajectory(clampedRatio * duration);
  };

  const handleDownloadCSV = () => {
    if (!activeTrajectory) return;

    const {
      timeSteps,
      positions,
      endEffectorPositions,
      manipulabilities,
      conditionNumbers,
    } = activeTrajectory;

    // Header format: time,joint1_pos,joint2_pos,...,ee_x,ee_y,ee_z,manipulability,condition_number
    const jointPosHeaders = robot.joints.map((_, idx) => `joint${idx + 1}_pos`);
    const header = [
      'time',
      ...jointPosHeaders,
      'ee_x',
      'ee_y',
      'ee_z',
      'manipulability',
      'condition_number',
    ].join(',');

    const rows: string[] = [header];

    for (let i = 0; i < timeSteps.length; i++) {
      const t = timeSteps[i].toFixed(4);
      const jPos = positions[i]
        ? positions[i].map((val) => val.toFixed(6)).join(',')
        : new Array(robot.dof).fill('0.000000').join(',');

      const ee = endEffectorPositions && endEffectorPositions[i]
        ? `${endEffectorPositions[i].x.toFixed(6)},${endEffectorPositions[i].y.toFixed(6)},${endEffectorPositions[i].z.toFixed(6)}`
        : '0.000000,0.000000,0.000000';

      const manip = (manipulabilities[i] ?? 0).toFixed(6);
      const cond = Number.isFinite(conditionNumbers[i])
        ? (conditionNumbers[i] ?? 0).toFixed(6)
        : '999999.000000';

      rows.push(`${t},${jPos},${ee},${manip},${cond}`);
    }

    const csvContent = rows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robot.name}_trajectory_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-black rounded-xl border border-amber-300 shadow-2xs">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-sm font-black text-black uppercase tracking-wider">Kinematic Analysis & Plotting</h2>
            <p className="text-xs text-black font-medium">
              RoboAnalyzer ZedGraph equivalent: multi-variable dynamic time-series charts
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            title="Download complete trajectory dataset as CSV"
            aria-label="Download CSV"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-black font-black text-xs rounded-xl border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-black" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Segmented Switcher & Quick Jumps */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white rounded-2xl border-2 border-stone-200 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-300">
          <button
            onClick={() => setMetric('positions')}
            className={`px-3 py-1.5 font-black rounded-lg transition-all cursor-pointer ${
              metric === 'positions'
                ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                : 'text-black hover:bg-white'
            }`}
          >
            Positions q(t)
          </button>
          <button
            onClick={() => setMetric('velocities')}
            className={`px-3 py-1.5 font-black rounded-lg transition-all cursor-pointer ${
              metric === 'velocities'
                ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                : 'text-black hover:bg-white'
            }`}
          >
            Velocities q̇(t)
          </button>
          <button
            onClick={() => setMetric('accelerations')}
            className={`px-3 py-1.5 font-black rounded-lg transition-all cursor-pointer ${
              metric === 'accelerations'
                ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                : 'text-black hover:bg-white'
            }`}
          >
            Accelerations q̈(t)
          </button>
          <button
            onClick={() => setMetric('ee-position')}
            className={`px-3 py-1.5 font-black rounded-lg transition-all cursor-pointer ${
              metric === 'ee-position'
                ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                : 'text-black hover:bg-white'
            }`}
          >
            EE Cartesian (X,Y,Z)
          </button>
          <button
            onClick={() => setMetric('dexterity')}
            className={`px-3 py-1.5 font-black rounded-lg transition-all cursor-pointer ${
              metric === 'dexterity'
                ? 'bg-amber-400 text-black border border-stone-900 shadow-xs'
                : 'text-black hover:bg-white'
            }`}
          >
            Manipulability w(t)
          </button>
        </div>

        {/* Quick Time Jumps */}
        <div className="flex items-center gap-1.5 text-xs text-black font-black">
          <span className="mr-1 hidden sm:inline uppercase">Jump:</span>
          <button
            onClick={() => seekTrajectory(0)}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-black font-black rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            0%
          </button>
          <button
            onClick={() => seekTrajectory(duration * 0.25)}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-black font-black rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            25%
          </button>
          <button
            onClick={() => seekTrajectory(duration * 0.5)}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-black font-black rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            50%
          </button>
          <button
            onClick={() => seekTrajectory(duration * 0.75)}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-black font-black rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            75%
          </button>
          <button
            onClick={() => seekTrajectory(duration)}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-black font-black rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            100%
          </button>
        </div>
      </div>

      {/* Main SVG Graph Card */}
      <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-black uppercase tracking-wide">{yLabel} vs Time (s)</span>
            <span className="px-2 py-0.5 bg-amber-100 text-black text-[10px] font-black rounded-md border border-amber-300">
              Interactive Scrubber
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-black" />
            <span className="text-black font-mono text-xs font-bold">
              t = <span className="text-black font-black bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300">{playback.currentTime.toFixed(2)}s</span> / {duration.toFixed(2)}s
            </span>
          </div>
        </div>

        {/* SVG Plot */}
        <div className="w-full overflow-x-auto bg-stone-50 rounded-xl border border-stone-300 p-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto cursor-crosshair font-mono text-[10px]"
            onClick={handleSvgClick}
          >
            {/* Background Rect */}
            <rect
              x={padding.left}
              y={padding.top}
              width={graphWidth}
              height={graphHeight}
              fill="#ffffff"
              rx="6"
            />

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const yVal = plotMinY + frac * (plotMaxY - plotMinY);
              const yPx = scaleY(yVal);
              return (
                <g key={frac}>
                  <line
                    x1={padding.left}
                    y1={yPx}
                    x2={padding.left + graphWidth}
                    y2={yPx}
                    stroke="#e7e5e4"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPx + 3}
                    textAnchor="end"
                    fill="#000000"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {yVal.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Time Ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const tVal = frac * duration;
              const xPx = scaleX(tVal);
              return (
                <g key={frac}>
                  <line
                    x1={xPx}
                    y1={padding.top}
                    x2={xPx}
                    y2={padding.top + graphHeight}
                    stroke="#f5f5f4"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <line
                    x1={xPx}
                    y1={padding.top + graphHeight}
                    x2={xPx}
                    y2={padding.top + graphHeight + 4}
                    stroke="#a8a29e"
                    strokeWidth="1"
                  />
                  <text
                    x={xPx}
                    y={padding.top + graphHeight + 16}
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {tVal.toFixed(1)}s
                  </text>
                </g>
              );
            })}

            {/* Primary Axes */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + graphHeight}
              stroke="#57534e"
              strokeWidth="2"
            />
            <line
              x1={padding.left}
              y1={padding.top + graphHeight}
              x2={padding.left + graphWidth}
              y2={padding.top + graphHeight}
              stroke="#57534e"
              strokeWidth="2"
            />

            {/* Plot Lines */}
            {seriesData.map((series) => {
              const pathPoints = series.values
                .map((val, idx) => {
                  const t = timeSteps[idx];
                  return `${scaleX(t)},${scaleY(val)}`;
                })
                .join(' ');

              return (
                <polyline
                  key={series.name}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pathPoints}
                />
              );
            })}

            {/* Live Playback Scrubber Line */}
            <line
              x1={scrubberX}
              y1={padding.top}
              x2={scrubberX}
              y2={padding.top + graphHeight}
              stroke="#000000"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <circle
              cx={scrubberX}
              cy={padding.top + graphHeight}
              r="4.5"
              fill="#d97706"
              stroke="#000000"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Legend & Real-Time Series Readout */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-stone-200 text-xs">
          {seriesData.map((s) => {
            const curVal = s.values[currentIndex];
            return (
              <div
                key={s.name}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-stone-300 shadow-2xs"
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-stone-400" style={{ backgroundColor: s.color }} />
                <span className="text-black font-black">{s.name}:</span>
                <span className="font-mono text-black font-black">
                  {typeof curVal === 'number' && Number.isFinite(curVal) ? curVal.toFixed(3) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry & Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-black text-xs font-black uppercase">
            <Clock className="w-4 h-4 text-black" />
            <span>Duration</span>
          </div>
          <div className="text-lg font-black text-black font-mono">
            {duration.toFixed(2)} <span className="text-xs text-black font-bold">sec</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-black text-xs font-black uppercase">
            <BarChart2 className="w-4 h-4 text-black" />
            <span>Data Points</span>
          </div>
          <div className="text-lg font-black text-black font-mono">
            {timeSteps.length} <span className="text-xs text-black font-bold">samples</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-black text-xs font-black uppercase">
            <Gauge className="w-4 h-4 text-black" />
            <span>Min Amplitude</span>
          </div>
          <div className="text-lg font-black text-black font-mono">
            {Number.isFinite(minY) ? minY.toFixed(3) : '0.000'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-black text-xs font-black uppercase">
            <Crosshair className="w-4 h-4 text-black" />
            <span>Max Amplitude</span>
          </div>
          <div className="text-lg font-black text-black font-mono">
            {Number.isFinite(maxY) ? maxY.toFixed(3) : '0.000'}
          </div>
        </div>
      </div>
    </div>
  );
};
