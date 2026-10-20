import React from 'react';
import {
  Activity,
  ArrowRightLeft,
  Compass,
  Focus,
  Gauge,
  Eye,
  EyeOff,
  Info,
  Layers,
  MousePointer2,
  Plane,
  X,
} from 'lucide-react';
import { ENGINES } from './engineData';
import type { EnginePart, EngineType, PieceInfo, ViewerState } from './types';
import type { InspectorTab } from './studioConfig';
import { isFlightTestbed, isShaftEngine, supportsVectoring, testbedLabel } from './studioConfig';
import { StudioTelemetry } from './StudioTelemetry';
import { SectionLabel } from './studioUi';
import { cx } from './studioUtils';

interface StudioInspectorProps {
  engine: EngineType;
  state: ViewerState;
  elapsed: number;
  tab: InspectorTab;
  selectedPart: EnginePart | null;
  selectedPiece: PieceInfo | null;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  onIsolate: (partId: string) => void;
  onToggleVisibility: (partId: string) => void;
  onOpenCatalog: () => void;
  onStartWalkthrough: () => void;
  onSelectMode: (mode: ViewerState['mode']) => void;
}

const TABS: { id: InspectorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'part', label: 'Part', icon: <MousePointer2 className="h-3.5 w-3.5" /> },
  { id: 'engine', label: 'Engine', icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'telemetry', label: 'Data', icon: <Activity className="h-3.5 w-3.5" /> },
];

const StudioInspectorComponent: React.FC<StudioInspectorProps> = ({
  engine,
  state,
  elapsed,
  tab,
  selectedPart,
  selectedPiece,
  onTabChange,
  onClose,
  onIsolate,
  onToggleVisibility,
  onOpenCatalog,
  onStartWalkthrough,
  onSelectMode,
}) => {
  const meta = ENGINES[engine];
  const isHidden = selectedPart ? state.hidden.includes(selectedPart.id) : false;
  const isIsolated = selectedPart ? state.isolated === selectedPart.id : false;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white/95 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-[10px] font-black text-white">
            {meta.code.split('-')[0]}
          </span>
          <div className="min-w-0">
            <span className="block truncate text-xs font-black text-stone-900">Studio Inspector</span>
            <span className="block truncate text-[10px] font-semibold text-stone-500">{meta.name}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Inspector sections" className="flex gap-1 border-b border-stone-200 bg-stone-50 p-1.5">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="inspector-panel"
              id={`inspector-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={cx(
                'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-black transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600',
                active
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:bg-white/60 hover:text-stone-800'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id="inspector-panel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto p-3"
      >
        {tab === 'part' ? (
          selectedPart ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: selectedPart.color }}
                    />
                    <span className="font-mono text-[10px] font-bold text-stone-500">
                      PART {selectedPart.number}
                    </span>
                  </div>
                  <h2 className="mt-1 text-sm font-black leading-snug text-stone-900">
                    {selectedPiece?.name ?? selectedPart.name}
                  </h2>
                  <span className="mt-0.5 block text-[11px] font-bold text-amber-700">
                    {selectedPart.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(selectedPart.id)}
                  aria-label={isHidden ? `Show ${selectedPart.name}` : `Hide ${selectedPart.name}`}
                  title={isHidden ? 'Show component' : 'Hide component'}
                  className={cx(
                    'shrink-0 rounded-lg p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
                    isHidden
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  )}
                >
                  {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <p className="text-xs leading-relaxed text-stone-600">{selectedPart.description}</p>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <SectionLabel>Engineered Material</SectionLabel>
                <p className="mt-1 text-xs font-bold leading-snug text-stone-800">
                  {selectedPart.material}
                </p>
              </div>

              {selectedPart.relation ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                  <SectionLabel>Interacts With</SectionLabel>
                  <p className="mt-1 text-xs font-bold leading-snug text-stone-800">
                    {selectedPart.relation}
                  </p>
                </div>
              ) : null}

              {selectedPiece ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                  <SectionLabel className="text-amber-700">Selected Hardware Piece</SectionLabel>
                  <p className="mt-1 text-xs font-bold leading-snug text-amber-950">
                    {selectedPiece.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-amber-800">
                    Click empty space or press Escape to clear.
                  </p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onIsolate(selectedPart.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2 text-xs font-black text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                >
                  <Focus className="h-3.5 w-3.5" />
                  {isIsolated ? 'Show Assembly' : 'Isolate'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMode('exploded')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-2 text-xs font-black text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Explore
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-4 text-center">
              <MousePointer2 className="h-6 w-6 text-stone-400" />
              <p className="text-xs font-bold text-stone-700">Nothing selected yet</p>
              <p className="text-[11px] leading-relaxed text-stone-500">
                Click a component in the 3D viewport or choose one from the assembly list to see its
                role, material, and relationships.
              </p>
              <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-stone-400">
                Tip: hover for a quick label
              </span>
            </div>
          )
        ) : null}

        {tab === 'engine' ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-50 to-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-black leading-tight text-stone-900">{meta.name}</h2>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-stone-500">
                    {meta.subtitle}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-stone-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700">
                  {meta.code}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-md border border-amber-200 bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                  {meta.family}
                </span>
                <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-600">
                  {meta.category}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-stone-600">{meta.description}</p>

            <div>
              <SectionLabel>Reference Specifications</SectionLabel>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {meta.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-stone-200 bg-white p-2"
                  >
                    <span className="block text-[10px] font-bold leading-tight text-stone-500">
                      {spec.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-black leading-snug text-stone-900">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onOpenCatalog}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-2 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Switch Engine
              </button>
              <button
                type="button"
                onClick={onStartWalkthrough}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-[11px] font-black text-white transition-all hover:from-amber-600 hover:to-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                <Compass className="h-3.5 w-3.5" />
                Guided Tour
              </button>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
              <SectionLabel>Test Stand</SectionLabel>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                {isFlightTestbed(engine)
                  ? `${testbedLabel(engine)} models throttle, altitude, temperature, reheat, and thrust.`
                  : isShaftEngine(engine)
                    ? `${testbedLabel(engine)} models throttle, altitude, temperature, torque, and shaft power.`
                    : `${testbedLabel(engine)} models throttle, torque, power, and thermal load.`}
              </p>
              <button
                type="button"
                onClick={() => onSelectMode('flight-sim')}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white py-1.5 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100"
              >
                {isFlightTestbed(engine) ? (
                  <Plane className="h-3.5 w-3.5" />
                ) : (
                  <Gauge className="h-3.5 w-3.5" />
                )}
                Open {testbedLabel(engine)}
              </button>
            </div>

            {supportsVectoring(engine) ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-[11px] font-semibold leading-relaxed text-blue-900">
                Thrust vectoring is available in the testbed: ±20° pitch authority with animated
                nozzle petals.
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'telemetry' ? <StudioTelemetry engine={engine} state={state} elapsed={elapsed} /> : null}
      </div>
    </div>
  );
};

function areInspectorPropsEqual(
  previous: StudioInspectorProps,
  next: StudioInspectorProps
): boolean {
  if (previous.elapsed !== next.elapsed && next.tab === 'telemetry') return false;
  return (
    previous.engine === next.engine &&
    previous.state === next.state &&
    previous.tab === next.tab &&
    previous.selectedPart === next.selectedPart &&
    previous.selectedPiece === next.selectedPiece &&
    previous.onTabChange === next.onTabChange &&
    previous.onClose === next.onClose &&
    previous.onIsolate === next.onIsolate &&
    previous.onToggleVisibility === next.onToggleVisibility &&
    previous.onOpenCatalog === next.onOpenCatalog &&
    previous.onStartWalkthrough === next.onStartWalkthrough &&
    previous.onSelectMode === next.onSelectMode
  );
}

export const StudioInspector = React.memo(StudioInspectorComponent, areInspectorPropsEqual);
