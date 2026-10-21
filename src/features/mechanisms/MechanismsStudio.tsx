import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  Gauge,
  Grid3x3,
  HelpCircle,
  Info,
  Layers,
  Maximize,
  Maximize2,
  Minimize,
  Minus,
  MousePointer2,
  Move3d,
  PanelRight,
  Pause,
  Plane,
  Play,
  Plus,
  Rotate3d,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { ENGINES, getParts } from './engineData';
import type { EnginePart, EngineType, PieceInfo, ViewerState } from './types';
import { DEFAULT_SECTION_DEPTH, DEFAULT_SECTION_PLANE, SECTION_PRESETS } from './sectionPlane';
import {
  advanceWalkthrough,
  exitWalkthrough,
  startWalkthrough,
  stepWalkthrough,
  WALKTHROUGHS,
} from './walkthroughs';
import { usePowertrainSimulation } from './usePowertrainSimulation';
import { soundSynthesizer } from './soundSynthesizer';
import { MechanismsScene } from './MechanismsScene';
import {
  CAMERA_OPTIONS,
  QUALITY_OPTIONS,
  isAerospace,
  isFlightTestbed,
  isShaftEngine,
  loadStudioPreferences,
  resetViewState,
  saveStudioPreferences,
  supportsAfterburner,
  supportsVectoring,
  testbedLabel,
  type InspectorTab,
} from './studioConfig';
import { StudioPartsDrawer } from './StudioPartsDrawer';
import { StudioInspector } from './StudioInspector';
import { StudioCatalog } from './StudioCatalog';
import { StudioHelp } from './StudioHelp';
import { RangeControl, SectionLabel, SegmentedControl, ToggleRow } from './studioUi';
import { cx } from './studioUtils';

const INITIAL_STATE: ViewerState = {
  engine: 'turbofan',
  mode: 'assembled',
  explode: 0,
  explodeLayout: 'inventory',
  spacing: 40,
  cycling: false,
  selectedPiece: null,
  isolatedPiece: null,
  section: DEFAULT_SECTION_DEPTH,
  sectionPlane: { ...DEFAULT_SECTION_PLANE },
  playing: false,
  speed: 1,
  flow: true,
  labels: true,
  grid: true,
  spin: false,
  hidden: [],
  selected: null,
  selectedParts: [],
  isolated: null,
  quality: 'ultra',
  camera: 'perspective',
  reset: 0,
  zoom: 0,
  walkthrough: null,
  throttle: 65,
  afterburner: false,
  altitude: 3500,
  vectoringPitch: 0,
  audioEnabled: false,
};

function createInitialState(): ViewerState {
  const preferences = loadStudioPreferences();
  const engine = preferences.engine ?? INITIAL_STATE.engine;
  const mode = preferences.mode ?? INITIAL_STATE.mode;
  return {
    ...INITIAL_STATE,
    ...preferences,
    engine,
    mode,
    vectoringPitch: supportsVectoring(engine) ? preferences.vectoringPitch ?? 0 : 0,
    afterburner: false,
    walkthrough: null,
    selected: null,
    selectedPiece: null,
    selectedParts: [],
    hidden: [],
    isolated: null,
    isolatedPiece: null,
    explode: 0,
    reset: 0,
    playing: mode === 'flight-sim',
  };
}

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;
const isWide = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

export const MechanismsStudio: React.FC = () => {
  const [s, setS] = useState<ViewerState>(createInitialState);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedPieceInfo, setSelectedPieceInfo] = useState<PieceInfo | null>(null);
  const [partsDrawerOpen, setPartsDrawerOpen] = useState(isDesktop);
  const [inspectorOpen, setInspectorOpen] = useState(isWide);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('engine');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  const [counts, setCounts] = useState({ total: 0, visible: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState('');
  const [dynoRun, setDynoRun] = useState(false);
  const [dynoProgress, setDynoProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const partsList = useMemo(() => getParts(s.engine), [s.engine]);
  const selectedPart = useMemo(
    () => partsList.find((part) => part.id === s.selected) ?? null,
    [partsList, s.selected]
  );
  const stations = WALKTHROUGHS[s.engine] ?? [];
  const currentStation = s.walkthrough ? stations[s.walkthrough.station] ?? null : null;
  const currentEngineMeta = ENGINES[s.engine];
  const isAero = isAerospace(s.engine);
  const isFlight = isFlightTestbed(s.engine);
  const testLabel = testbedLabel(s.engine);
  const testShortLabel = isFlight ? 'Flight' : isShaftEngine(s.engine) ? 'Shaft' : 'Dyno';
  const canAfterburn = supportsAfterburner(s.engine);
  const canVector = supportsVectoring(s.engine);
  const canFlow = currentEngineMeta.flow;

  const powertrain = usePowertrainSimulation(s);
  const telemetry = powertrain.telemetry;

  // Audio synthesizer lifecycle.
  useEffect(() => {
    if (s.audioEnabled && (s.playing || s.mode === 'flight-sim')) {
      soundSynthesizer.start(s.engine);
    } else {
      soundSynthesizer.stop();
    }
  }, [s.audioEnabled, s.playing, s.mode, s.engine]);

  // Keep the acoustic model locked to the simulated firing/electrical frequency.
  useEffect(() => {
    if (!s.audioEnabled) return;
    soundSynthesizer.update(s.engine, s.throttle, s.afterburner, telemetry.rpm);
  }, [s.audioEnabled, s.engine, s.throttle, s.afterburner, telemetry.rpm]);

  // Automated dyno pull: ramp to full throttle, hold on the limiter, then settle.
  useEffect(() => {
    if (!dynoRun) return;
    const started = performance.now();
    const duration = 9000;
    let raf = 0;
    let lastThrottle = -1;
    let lastProgress = -1;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const target =
        t < 0.8 ? Math.min(1, t / 0.68) : Math.max(0, 1 - (t - 0.8) / 0.2);
      const throttle = Math.round(target * 100);
      const progress = Math.round(t * 100);
      if (progress !== lastProgress) {
        lastProgress = progress;
        setDynoProgress(progress / 100);
      }
      if (throttle !== lastThrottle) {
        lastThrottle = throttle;
        setS((previous) => ({ ...previous, playing: true, throttle }));
      }
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setDynoRun(false);
        setDynoProgress(0);
        setStatus('Dyno pull complete. Peak values are held in the telemetry inspector.');
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [dynoRun]);

  // Guided walkthrough auto-advancing with a reading-time-aware dwell.
  useEffect(() => {
    if (!s.walkthrough?.playing || catalogOpen || helpOpen || viewMenuOpen) return;
    const bodyLength = currentStation?.body.length ?? 140;
    const dwellMs = Math.min(18000, Math.max(7000, bodyLength * 55));
    const timer = window.setTimeout(() => {
      setS((previous) => (previous.walkthrough?.playing ? advanceWalkthrough(previous) : previous));
    }, dwellMs / Math.max(0.25, s.speed));
    return () => window.clearTimeout(timer);
  }, [
    s.walkthrough?.station,
    s.walkthrough?.playing,
    s.speed,
    s.engine,
    catalogOpen,
    helpOpen,
    viewMenuOpen,
    currentStation?.body.length,
  ]);

  // Persist stable presentation preferences; transient selection and tour state stay out.
  useEffect(() => {
    const timer = window.setTimeout(() => saveStudioPreferences(s), 250);
    return () => window.clearTimeout(timer);
  }, [s]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) setViewMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [viewMenuOpen]);

  const updateState = useCallback((patch: Partial<ViewerState>) => {
    setS((previous) => ({ ...previous, ...patch }));
  }, []);

  const openInspector = useCallback((tab: InspectorTab) => {
    setInspectorTab(tab);
    setInspectorOpen(true);
    setViewMenuOpen(false);
  }, []);

  const toggleInspector = useCallback(
    (tab: InspectorTab) => {
      setInspectorOpen((previousOpen) => {
        if (previousOpen && inspectorTab === tab) return false;
        return true;
      });
      setInspectorTab(tab);
      setViewMenuOpen(false);
    },
    [inspectorTab]
  );

  const selectMode = useCallback((mode: ViewerState['mode']) => {
    setDynoRun(false);
    setDynoProgress(0);
    setS((previous) => {
      const base = previous.walkthrough ? exitWalkthrough(previous) : previous;
      return {
        ...base,
        mode,
        ...(mode === 'assembled' ? { explode: 0 } : {}),
        ...(mode === 'exploded' && base.explode < 1 ? { explode: 55 } : {}),
        ...(mode === 'flight-sim' ? { playing: true } : {}),
        ...(mode !== 'flight-sim' && base.mode === 'flight-sim'
          ? { playing: false, afterburner: false }
          : {}),
      };
    });
    setSelectedPieceInfo(null);
    setViewMenuOpen(false);
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1280px)').matches) {
      setInspectorOpen(false);
    }
    setStatus(
      mode === 'flight-sim'
        ? `Switched to ${testbedLabel(s.engine)}.`
        : `Switched to ${mode === 'exploded' ? 'exploded hardware' : mode} mode.`
    );
  }, [s.engine]);

  const changeEngine = useCallback((newEngine: EngineType) => {
    setDynoRun(false);
    setDynoProgress(0);
    setS((previous) => ({
      ...INITIAL_STATE,
      engine: newEngine,
      audioEnabled: previous.audioEnabled,
      quality: previous.quality,
      camera: previous.camera,
      flow: previous.flow,
      labels: previous.labels,
      grid: previous.grid,
      speed: previous.speed,
      throttle: previous.throttle,
      altitude: previous.altitude,
      reset: previous.reset + 1,
      playing: false,
    }));
    setSelectedPieceInfo(null);
    setCatalogOpen(false);
    setInspectorTab('engine');
    setInspectorOpen(true);
    setStatus(`Loaded ${ENGINES[newEngine].name}.`);
  }, []);

  const handleSelectPart = useCallback((partId: string | null, piece?: PieceInfo | null) => {
    setSelectedPieceInfo(piece ?? null);
    setS((previous) => {
      const base = previous.walkthrough ? exitWalkthrough(previous) : previous;
      return {
        ...base,
        selected: partId,
        selectedPiece: piece?.id ?? null,
        selectedParts: [],
      };
    });
    if (partId) {
      setInspectorTab('part');
      setInspectorOpen(true);
    }
  }, []);

  const handleSelectPartFromList = useCallback(
    (part: EnginePart) => handleSelectPart(part.id, null),
    [handleSelectPart]
  );

  const handleTogglePartVisibility = useCallback((partId: string) => {
    setS((previous) => {
      const isHidden = previous.hidden.includes(partId);
      return {
        ...previous,
        hidden: isHidden
          ? previous.hidden.filter((id) => id !== partId)
          : [...previous.hidden, partId],
      };
    });
  }, []);

  const handleIsolatePart = useCallback((partId: string) => {
    setS((previous) => ({
      ...previous,
      isolated: previous.isolated === partId ? null : partId,
      isolatedPiece: null,
      hidden: previous.hidden.filter((id) => id !== partId),
    }));
  }, []);

  const handleResetVisibility = useCallback(() => {
    updateState({ hidden: [], isolated: null, isolatedPiece: null });
    setStatus('Part visibility restored.');
  }, [updateState]);

  const handleCloseParts = useCallback(() => setPartsDrawerOpen(false), []);
  const handleCloseInspector = useCallback(() => setInspectorOpen(false), []);
  const handleOpenCatalog = useCallback(() => setCatalogOpen(true), []);
  const handleStats = useCallback((total: number, visible: number) => {
    setCounts((previous) =>
      previous.total === total && previous.visible === visible
        ? previous
        : { total, visible }
    );
  }, []);

  const handleStartWalkthrough = useCallback(() => {
    if (!WALKTHROUGHS[s.engine]?.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setS((previous) => {
      const started = startWalkthrough(previous.walkthrough ? exitWalkthrough(previous) : previous);
      if (!started.walkthrough || !reduceMotion) return started;
      return { ...started, walkthrough: { ...started.walkthrough, playing: false } };
    });
    setSelectedPieceInfo(null);
    setInspectorOpen(false);
    setConsoleExpanded(true);
    setStatus('Guided tour started.');
  }, [s.engine]);

  const handleExitWalkthrough = useCallback(() => {
    setS((previous) => (previous.walkthrough ? exitWalkthrough(previous) : previous));
    setSelectedPieceInfo(null);
    setStatus('Exited guided tour.');
  }, []);

  const handleResetView = useCallback(() => {
    setS((previous) => resetViewState(previous));
    setSelectedPieceInfo(null);
    setViewMenuOpen(false);
    setStatus('View reset.');
  }, []);

  const handleFullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (typeof element.requestFullscreen === 'function') {
      void element.requestFullscreen().catch(() => setStatus('Fullscreen is unavailable here.'));
    }
  }, []);

  // Global keyboard shortcuts. Dialogs manage their own Escape/focus handling.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (catalogOpen || helpOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        if (viewMenuOpen) {
          setViewMenuOpen(false);
          return;
        }
        if (inspectorOpen && !s.walkthrough) {
          setInspectorOpen(false);
          return;
        }
        setS((previous) => {
          if (previous.walkthrough) return exitWalkthrough(previous);
          return {
            ...previous,
            selected: null,
            selectedPiece: null,
            selectedParts: [],
            isolated: null,
            isolatedPiece: null,
          };
        });
        setSelectedPieceInfo(null);
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (!s.walkthrough) return;
        event.preventDefault();
        setS((previous) =>
          previous.walkthrough
            ? stepWalkthrough(previous, event.key === 'ArrowRight' ? 1 : -1)
            : previous
        );
        return;
      }

      if (event.code === 'Space') {
        if (target?.closest('button')) return;
        event.preventDefault();
        setS((previous) =>
          previous.walkthrough
            ? {
                ...previous,
                walkthrough: {
                  ...previous.walkthrough,
                  playing: !previous.walkthrough.playing,
                },
              }
            : { ...previous, playing: !previous.playing }
        );
        return;
      }

      switch (event.key.toLowerCase()) {
        case '1':
          selectMode('assembled');
          break;
        case '2':
          selectMode('cutaway');
          break;
        case '3':
          selectMode('exploded');
          break;
        case '4':
          selectMode('flight-sim');
          break;
        case 'r':
          setS((previous) => ({ ...previous, reset: previous.reset + 1, zoom: 0 }));
          break;
        case 'g':
          setS((previous) => ({ ...previous, grid: !previous.grid }));
          break;
        case 'l':
          setS((previous) => ({ ...previous, labels: !previous.labels }));
          break;
        case 'f':
          if (!ENGINES[s.engine].flow) break;
          setS((previous) => ({ ...previous, flow: !previous.flow }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    catalogOpen,
    helpOpen,
    viewMenuOpen,
    inspectorOpen,
    s.walkthrough,
    s.engine,
    selectMode,
  ]);

  const cameraOptions = CAMERA_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
    hint: option.hint,
  }));

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#f7f4ed] font-sans text-stone-900"
    >
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>

      {/* Header */}
      <header className="z-40 flex items-center justify-between gap-2 border-b border-stone-200/90 bg-white/85 px-2.5 py-2 shadow-2xs backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={catalogOpen}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-left transition-all hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 active:scale-[0.98] sm:gap-2.5 sm:px-3"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-[10px] font-black text-white">
              {currentEngineMeta.code.split('-')[0]}
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[11px] font-black uppercase tracking-wide sm:text-xs">
                  {currentEngineMeta.name}
                </span>
                <span className="hidden shrink-0 rounded-md bg-stone-200 px-1.5 py-0.5 text-[9px] font-bold text-stone-700 md:inline">
                  {currentEngineMeta.code}
                </span>
              </span>
              <span className="hidden truncate text-[10px] font-medium text-stone-500 sm:block">
                {currentEngineMeta.subtitle}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          </button>

          <span className="hidden rounded-lg border border-stone-200 bg-stone-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-stone-700 lg:inline-flex">
            {currentEngineMeta.family}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => updateState({ audioEnabled: !s.audioEnabled })}
            aria-label={s.audioEnabled ? 'Mute engine audio' : 'Enable engine audio synthesis'}
            aria-pressed={s.audioEnabled}
            title={s.audioEnabled ? 'Mute engine audio' : 'Enable acoustic audio synthesis'}
            className={cx(
              'rounded-xl border p-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
              s.audioEnabled
                ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-xs'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
            )}
          >
            {s.audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setPartsDrawerOpen((open) => !open)}
            aria-label={partsDrawerOpen ? 'Hide component drawer' : 'Show component drawer'}
            aria-pressed={partsDrawerOpen}
            aria-controls="studio-parts-drawer"
            title="Assembly components"
            className={cx(
              'flex items-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-black transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:px-3',
              partsDrawerOpen
                ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Components</span>
            <span className="hidden text-[10px] opacity-75 sm:inline">({partsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleInspector('engine')}
            aria-label="Toggle engine information inspector"
            aria-pressed={inspectorOpen && inspectorTab === 'engine'}
            title="Engine information"
            className="hidden rounded-xl border border-stone-300 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:block"
          >
            <Info className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => toggleInspector('telemetry')}
            aria-label="Toggle live telemetry inspector"
            aria-pressed={inspectorOpen && inspectorTab === 'telemetry'}
            title="Live telemetry"
            className="hidden rounded-xl border border-stone-300 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:block"
          >
            <Activity className="h-4 w-4" />
          </button>

          <div ref={viewMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setViewMenuOpen((open) => !open)}
              aria-label="View and performance settings"
              aria-expanded={viewMenuOpen}
              aria-controls="studio-view-menu"
              title="View settings"
              className={cx(
                'rounded-xl border p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
                viewMenuOpen
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {viewMenuOpen ? (
              <div
                id="studio-view-menu"
                className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[19rem] max-w-[calc(100vw-1.25rem)] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white/98 p-3 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <SectionLabel>Display</SectionLabel>
                  <button
                    type="button"
                    onClick={handleResetView}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset studio
                  </button>
                </div>

                <div className="space-y-1.5">
                  <ToggleRow
                    label="Airflow particles"
                    description={canFlow ? 'Intake-to-exhaust streamlines' : 'Not modelled for this engine'}
                    checked={s.flow && canFlow}
                    disabled={!canFlow}
                    onChange={(flow) => updateState({ flow })}
                    icon={<Wind className="h-3.5 w-3.5" />}
                  />
                  <ToggleRow
                    label="Component callouts"
                    description="Floating part labels in the viewport"
                    checked={s.labels}
                    onChange={(labels) => updateState({ labels })}
                    icon={<MousePointer2 className="h-3.5 w-3.5" />}
                  />
                  <ToggleRow
                    label="Floor grid"
                    description="Machinist reference grid"
                    checked={s.grid}
                    onChange={(grid) => updateState({ grid })}
                    icon={<Grid3x3 className="h-3.5 w-3.5" />}
                  />
                  <ToggleRow
                    label="Auto-rotate"
                    description="Slow studio turntable"
                    checked={s.spin}
                    onChange={(spin) => updateState({ spin })}
                    icon={<Rotate3d className="h-3.5 w-3.5" />}
                  />
                </div>

                <div className="border-t border-stone-200 pt-2">
                  <SectionLabel>Camera</SectionLabel>
                  <div className="mt-1.5">
                    <SegmentedControl
                      label="Camera view"
                      value={s.camera}
                      options={cameraOptions}
                      onChange={(camera) => updateState({ camera })}
                    />
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-2">
                  <SectionLabel>Render Quality</SectionLabel>
                  <div className="mt-1.5">
                    <SegmentedControl
                      label="Render quality"
                      value={s.quality}
                      options={QUALITY_OPTIONS.map((option) => ({
                        value: option.id,
                        label: option.label,
                        hint: option.hint,
                      }))}
                      onChange={(quality) => updateState({ quality })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 border-t border-stone-200 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateState({ reset: s.reset + 1, zoom: 0 });
                      setViewMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-1.5 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Fit view
                  </button>
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-1.5 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize className="h-3.5 w-3.5" />
                    )}
                    {isFullscreen ? 'Exit full' : 'Fullscreen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openInspector('engine')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-1.5 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    <Info className="h-3.5 w-3.5" /> Engine info
                  </button>
                  <button
                    type="button"
                    onClick={() => openInspector('telemetry')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-1.5 text-[11px] font-black text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    <Activity className="h-3.5 w-3.5" /> Telemetry
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Open controls and mechanical principles reference"
            title="Controls & principles"
            className="rounded-xl border border-stone-300 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Workbench */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          id="studio-parts-drawer"
          aria-hidden={!partsDrawerOpen}
          inert={!partsDrawerOpen}
          className={cx(
            'absolute inset-y-0 left-0 z-30 w-72 max-w-[88vw] shrink-0 overflow-hidden border-r border-stone-200 bg-white/95 shadow-xl backdrop-blur-2xl transition-[transform,width] duration-300 sm:relative sm:z-10 sm:shadow-none',
            partsDrawerOpen ? 'translate-x-0 sm:w-72' : '-translate-x-full sm:w-0 sm:border-r-0'
          )}
        >
          <StudioPartsDrawer
            engine={s.engine}
            parts={partsList}
            selected={s.selected}
            selectedParts={s.selectedParts}
            hidden={s.hidden}
            isolated={s.isolated}
            onSelect={handleSelectPartFromList}
            onToggleVisibility={handleTogglePartVisibility}
            onIsolate={handleIsolatePart}
            onResetVisibility={handleResetVisibility}
            onClose={handleCloseParts}
          />
        </aside>

        <main className="relative h-full min-w-0 flex-1 overflow-hidden bg-[#f7f4ed]">
          <MechanismsScene
            state={s}
            onSelect={handleSelectPart}
            onStats={handleStats}
            rpm={telemetry.rpm}
            load={powertrain.load}
          />

          {/* Model title */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-12rem)] sm:left-4 sm:top-4 sm:max-w-[calc(100%-17rem)]">
            <h1 className="truncate text-base font-black tracking-tight text-stone-900 sm:text-2xl">
              {currentEngineMeta.name}{' '}
              <span className="font-light text-stone-500">Architecture</span>
            </h1>
            <p className="hidden truncate text-[11px] font-bold tracking-wide text-stone-600 sm:block">
              {currentEngineMeta.subtitle}
            </p>
          </div>

          {/* Camera & inspection toolbar */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-2xl border border-stone-200 bg-white/90 p-1 shadow-md backdrop-blur-xl sm:right-4 sm:top-4">
            <button
              type="button"
              onClick={() => updateState({ zoom: s.zoom + 1 })}
              aria-label="Zoom in"
              title="Zoom in"
              className="rounded-xl p-2 text-stone-700 transition-colors hover:bg-stone-100 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateState({ zoom: s.zoom - 1 })}
              aria-label="Zoom out"
              title="Zoom out"
              className="rounded-xl p-2 text-stone-700 transition-colors hover:bg-stone-100 active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateState({ reset: s.reset + 1, isolated: null, isolatedPiece: null })}
              aria-label="Fit view to model"
              title="Fit view"
              className="rounded-xl p-2 text-stone-700 transition-colors hover:bg-stone-100 active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateState({ spin: !s.spin })}
              aria-label="Toggle auto-rotate camera"
              aria-pressed={s.spin}
              title="Auto-rotate camera"
              className={cx(
                'rounded-xl p-2 transition-all active:scale-95',
                s.spin ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-700 hover:bg-stone-100'
              )}
            >
              <Rotate3d className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateState({ grid: !s.grid })}
              aria-label="Toggle floor grid"
              aria-pressed={s.grid}
              title="Floor grid"
              className={cx(
                'hidden rounded-xl p-2 transition-all active:scale-95 sm:block',
                s.grid ? 'bg-stone-200 text-stone-900' : 'text-stone-400 hover:bg-stone-100'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateState({ labels: !s.labels })}
              aria-label="Toggle component labels"
              aria-pressed={s.labels}
              title="Component labels"
              className={cx(
                'hidden rounded-xl p-2 transition-all active:scale-95 sm:block',
                s.labels ? 'bg-stone-200 text-stone-900' : 'text-stone-400 hover:bg-stone-100'
              )}
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openInspector(inspectorTab)}
              aria-label="Open inspector panel"
              title="Inspector"
              className="rounded-xl p-2 text-stone-700 transition-colors hover:bg-stone-100 active:scale-95 xl:hidden"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>

          {/* Guided walkthrough station card */}
          {currentStation && s.walkthrough ? (
            <div className="absolute left-3 top-16 z-20 max-h-[calc(100%-8rem)] w-[24rem] max-w-[calc(100%-1.5rem)] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border-2 border-amber-400 bg-white/95 p-3.5 shadow-xl backdrop-blur-2xl sm:left-4 sm:top-20 sm:p-4">
              <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700">
                  <Compass className="h-3.5 w-3.5" /> Station {s.walkthrough.station + 1} of{' '}
                  {stations.length}
                </span>
                <button
                  type="button"
                  onClick={handleExitWalkthrough}
                  aria-label="Exit guided tour"
                  className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div aria-live="polite">
                <h2 className="text-sm font-black leading-snug text-stone-900 sm:text-base">
                  {currentStation.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">{currentStation.body}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1" aria-label="Tour progress">
                {stations.map((station, index) => {
                  const active = index === s.walkthrough?.station;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() =>
                        setS((previous) =>
                          previous.walkthrough
                            ? stepWalkthrough(previous, index - previous.walkthrough.station)
                            : previous
                        )
                      }
                      aria-label={`Go to station ${index + 1}: ${station.title}`}
                      aria-current={active ? 'step' : undefined}
                      className={cx(
                        'h-1.5 rounded-full transition-all',
                        active ? 'w-6 bg-amber-600' : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                      )}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setS((previous) => stepWalkthrough(previous, -1))}
                  disabled={s.walkthrough.station === 0}
                  className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-800 transition-colors hover:bg-stone-200 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setS((previous) =>
                      previous.walkthrough
                        ? {
                            ...previous,
                            walkthrough: {
                              ...previous.walkthrough,
                              playing: !previous.walkthrough.playing,
                            },
                          }
                        : previous
                    )
                  }
                  className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-xs transition-colors hover:bg-amber-600"
                >
                  {s.walkthrough.playing ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span>{s.walkthrough.playing ? 'Pause' : 'Play'}</span>
                </button>
                {s.walkthrough.station === stations.length - 1 && !s.walkthrough.playing ? (
                  <button
                    type="button"
                    onClick={() =>
                      setS((previous) =>
                        previous.walkthrough
                          ? stepWalkthrough(previous, -previous.walkthrough.station)
                          : previous
                      )
                    }
                    className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-black text-white transition-colors hover:bg-black"
                  >
                    Replay
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setS((previous) => stepWalkthrough(previous, 1))}
                    disabled={s.walkthrough.station === stations.length - 1}
                    className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-800 transition-colors hover:bg-stone-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Bottom mode console */}
          <div className="absolute bottom-3 left-3 right-3 z-20 max-h-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-stone-200/90 bg-white/95 shadow-xl backdrop-blur-2xl sm:left-4 sm:right-4">
            <div className="flex flex-col gap-2 border-b border-stone-200/80 p-2 sm:flex-row sm:items-center sm:justify-between sm:px-3 sm:py-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:gap-1.5 sm:pb-0">
                <button
                  type="button"
                  onClick={() => selectMode('assembled')}
                  aria-pressed={s.mode === 'assembled'}
                  className={cx(
                    'flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-all sm:gap-1.5 sm:px-3 sm:text-xs',
                    s.mode === 'assembled'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>Assembled</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectMode('cutaway')}
                  aria-pressed={s.mode === 'cutaway'}
                  className={cx(
                    'flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-all sm:gap-1.5 sm:px-3 sm:text-xs',
                    s.mode === 'cutaway'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  <span>Cutaway</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectMode('exploded')}
                  aria-pressed={s.mode === 'exploded'}
                  className={cx(
                    'flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-all sm:gap-1.5 sm:px-3 sm:text-xs',
                    s.mode === 'exploded'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Exploded</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectMode('flight-sim')}
                  aria-pressed={s.mode === 'flight-sim'}
                  className={cx(
                    'flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-all sm:gap-1.5 sm:px-3 sm:text-xs',
                    s.mode === 'flight-sim'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  {isFlight ? <Plane className="h-3.5 w-3.5" /> : <Gauge className="h-3.5 w-3.5" />}
                  <span className="sm:hidden">{testShortLabel}</span>
                  <span className="hidden sm:inline">{testLabel}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateState({ playing: !s.playing })}
                  className={cx(
                    'flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-all sm:gap-1.5 sm:px-3 sm:text-xs',
                    s.playing
                      ? 'border border-amber-300 bg-amber-100 text-amber-900'
                      : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                  )}
                >
                  {s.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{s.playing ? 'Pause' : 'Spool Up'}</span>
                </button>

                <label className="sr-only" htmlFor="studio-speed">
                  Playback speed
                </label>
                <select
                  id="studio-speed"
                  value={s.speed}
                  onChange={(event) => updateState({ speed: Number(event.target.value) })}
                  className="rounded-xl border border-stone-200 bg-stone-100 px-1.5 py-1.5 text-[11px] font-bold text-stone-800 sm:px-2 sm:text-xs"
                >
                  <option value={0.25}>0.25×</option>
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1.0×</option>
                  <option value={2}>2.0×</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    s.walkthrough ? handleExitWalkthrough() : handleStartWalkthrough()
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs transition-all hover:from-amber-600 hover:to-orange-600 active:scale-95 sm:px-3 sm:text-xs"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>{s.walkthrough ? 'Exit Tour' : 'Tour'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConsoleExpanded((expanded) => !expanded)}
                  aria-label={consoleExpanded ? 'Collapse mode controls' : 'Expand mode controls'}
                  aria-expanded={consoleExpanded}
                  aria-controls="studio-mode-panel"
                  title={consoleExpanded ? 'Collapse controls' : 'Expand controls'}
                  className="rounded-xl p-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                >
                  {consoleExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {consoleExpanded ? (
              <div id="studio-mode-panel">
                {s.mode === 'cutaway' ? (
                  <div className="space-y-3 border-t border-stone-200 bg-stone-50/80 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <RangeControl
                        label="Section depth"
                        value={s.section}
                        min={0}
                        max={100}
                        onChange={(section) => updateState({ section })}
                        format={(value) => `${Math.round(value)}%`}
                        accent="amber"
                      />
                      <RangeControl
                        label="Cut plane yaw"
                        value={s.sectionPlane.yaw}
                        min={-180}
                        max={180}
                        onChange={(yaw) =>
                          updateState({
                            sectionPlane: {
                              ...s.sectionPlane,
                              yaw,
                              free: true,
                              showGizmo: true,
                            },
                          })
                        }
                        format={(value) => `${Math.round(value)}°`}
                        accent="amber"
                      />
                      <RangeControl
                        label="Cut plane pitch"
                        value={s.sectionPlane.pitch}
                        min={-90}
                        max={90}
                        onChange={(pitch) =>
                          updateState({
                            sectionPlane: {
                              ...s.sectionPlane,
                              pitch,
                              free: true,
                              showGizmo: true,
                            },
                          })
                        }
                        format={(value) => `${Math.round(value)}°`}
                        accent="amber"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="text-stone-500">Presets:</span>
                      {SECTION_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            updateState({
                              sectionPlane: {
                                ...s.sectionPlane,
                                yaw: preset.yaw,
                                pitch: preset.pitch,
                                free: true,
                                showGizmo: true,
                              },
                            })
                          }
                          className="rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-stone-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateState({
                            section: DEFAULT_SECTION_DEPTH,
                            sectionPlane: { ...DEFAULT_SECTION_PLANE },
                          })
                        }
                        className="ml-auto flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-stone-600 transition-colors hover:bg-stone-100"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset cut
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-stone-700">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={s.sectionPlane.free}
                          onChange={(event) =>
                            updateState({
                              sectionPlane: { ...s.sectionPlane, free: event.target.checked },
                            })
                          }
                          className="accent-amber-600"
                        />
                        <span>Cut internal hardware</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={s.sectionPlane.showGizmo}
                          onChange={(event) =>
                            updateState({
                              sectionPlane: {
                                ...s.sectionPlane,
                                showGizmo: event.target.checked,
                              },
                            })
                          }
                          className="accent-amber-600"
                        />
                        <span>Show plane gizmo</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateState({
                            sectionPlane: {
                              ...s.sectionPlane,
                              flipped: !s.sectionPlane.flipped,
                              free: true,
                            },
                          })
                        }
                        className="rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-stone-700 transition-colors hover:bg-stone-100"
                      >
                        Flip cut side
                      </button>
                    </div>
                  </div>
                ) : null}

                {s.mode === 'exploded' ? (
                  <div className="space-y-2 border-t border-stone-200 bg-stone-50/80 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <RangeControl
                        label="Separation"
                        value={s.explode}
                        min={0}
                        max={100}
                        onChange={(explode) => updateState({ explode })}
                        format={(value) => `${Math.round(value)}%`}
                        accent="indigo"
                      />
                      <div>
                        <label
                          htmlFor="studio-explode-layout"
                          className="mb-1 block text-xs font-bold text-stone-700"
                        >
                          Layout
                        </label>
                        <select
                          id="studio-explode-layout"
                          value={s.explodeLayout}
                          onChange={(event) =>
                            updateState({
                              explodeLayout: event.target.value as 'radial' | 'inventory',
                            })
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-bold text-stone-800"
                        >
                          <option value="inventory">2D shelf packing</option>
                          <option value="radial">3D radial spread</option>
                        </select>
                      </div>
                      <RangeControl
                        label="Spacing"
                        value={s.spacing}
                        min={0}
                        max={100}
                        onChange={(spacing) => updateState({ spacing })}
                        format={(value) => `${Math.round(value)}%`}
                        accent="indigo"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-stone-500">
                      <span>
                        Showing {counts.visible} of {counts.total} hardware pieces. Click any piece to
                        inspect it.
                      </span>
                      <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5">
                        {s.explodeLayout === 'inventory' ? 'Inventory view' : 'Radial view'}
                      </span>
                    </div>
                  </div>
                ) : null}

                {s.mode === 'flight-sim' ? (
                  <div className="space-y-3 border-t border-stone-200 bg-stone-50/80 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <RangeControl
                        label="Throttle"
                        value={s.throttle}
                        min={0}
                        max={100}
                        onChange={(throttle) => updateState({ throttle })}
                        format={(value) => `${Math.round(value)}%`}
                        accent="amber"
                      />
                      {!isFlight ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (dynoRun) return;
                            setDynoProgress(0);
                            setDynoRun(true);
                          }}
                          disabled={dynoRun}
                          aria-pressed={dynoRun}
                          className={cx(
                            'relative flex min-h-[3.25rem] flex-col justify-center gap-1 overflow-hidden rounded-xl px-3 py-2 text-xs font-black transition-all',
                            dynoRun
                              ? 'border border-amber-300 bg-amber-100 text-amber-900'
                              : 'border border-stone-300 bg-white text-stone-800 hover:border-amber-300 hover:bg-amber-50'
                          )}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <Gauge className="h-3.5 w-3.5" />
                            {dynoRun ? 'Pull in progress…' : 'Run dyno pull'}
                          </span>
                          {dynoRun ? (
                            <span className="absolute inset-x-0 bottom-0 h-1 bg-amber-200">
                              <span
                                className="block h-full bg-amber-600 transition-[width] duration-100"
                                style={{ width: `${Math.round(dynoProgress * 100)}%` }}
                              />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-stone-500">
                              Idle → redline → idle sweep
                            </span>
                          )}
                        </button>
                      ) : null}
                      {isAero ? (
                        <RangeControl
                          label="Altitude"
                          value={s.altitude}
                          min={0}
                          max={18000}
                          step={500}
                          onChange={(altitude) => updateState({ altitude })}
                          format={(value) => `${(value / 1000).toFixed(1)} km`}
                          accent="blue"
                        />
                      ) : null}
                      {canVector ? (
                        <RangeControl
                          label="Thrust vector"
                          value={s.vectoringPitch}
                          min={-20}
                          max={20}
                          onChange={(vectoringPitch) => updateState({ vectoringPitch })}
                          format={(value) => `${value > 0 ? '+' : ''}${Math.round(value)}°`}
                          accent="blue"
                          hint="Pitch authority ±20°"
                        />
                      ) : null}
                      {canAfterburn ? (
                        <button
                          type="button"
                          onClick={() => updateState({ afterburner: !s.afterburner })}
                          aria-pressed={s.afterburner}
                          className={cx(
                            'flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all',
                            s.afterburner
                              ? 'animate-pulse bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                              : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                          )}
                        >
                          <Flame className="h-3.5 w-3.5" />
                          <span>{s.afterburner ? 'Reheat ACTIVE' : 'Arm Afterburner'}</span>
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isFlight ? (
                        <>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {Math.round(telemetry.rpm).toLocaleString()} rpm
                          </span>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {telemetry.thrustKN.toFixed(1)} kN
                          </span>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            Mach {telemetry.airspeedMach.toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            <Wind className="h-3 w-3" /> TIT {telemetry.turbineInletTempC}°C
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {Math.round(telemetry.rpm).toLocaleString()} rpm
                          </span>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {telemetry.torqueNm.toFixed(1)} N·m
                          </span>
                          <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {telemetry.powerKW.toFixed(1)} kW
                          </span>
                        </>
                      )}
                      {telemetry.afterburnerActive ? (
                        <span className="flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
                          <Flame className="h-3 w-3" /> Reheat
                        </span>
                      ) : null}
                      {telemetry.vectoringAngleDeg !== 0 ? (
                        <span className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
                          <Move3d className="h-3 w-3" /> Vector{' '}
                          {telemetry.vectoringAngleDeg > 0 ? '+' : ''}
                          {Math.round(telemetry.vectoringAngleDeg)}°
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openInspector('telemetry')}
                        className="ml-auto text-[10px] font-black text-amber-700 underline-offset-2 hover:underline"
                      >
                        Open full telemetry →
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </main>

        <aside
          aria-hidden={!inspectorOpen}
          inert={!inspectorOpen}
          className={cx(
            'absolute inset-y-0 right-0 z-40 w-[22rem] max-w-full shrink-0 overflow-hidden border-l border-stone-200 bg-white/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 xl:relative xl:inset-y-auto xl:z-10 xl:w-[22rem] xl:shadow-none',
            inspectorOpen ? 'translate-x-0' : 'translate-x-full xl:hidden'
          )}
        >
          <StudioInspector
            engine={s.engine}
            state={s}
            telemetry={telemetry}
            crankAngleRad={powertrain.crankAngleRad}
            tab={inspectorTab}
            selectedPart={selectedPart}
            selectedPiece={selectedPieceInfo}
            onTabChange={setInspectorTab}
            onClose={handleCloseInspector}
            onIsolate={handleIsolatePart}
            onToggleVisibility={handleTogglePartVisibility}
            onOpenCatalog={handleOpenCatalog}
            onStartWalkthrough={handleStartWalkthrough}
            onSelectMode={selectMode}
          />
        </aside>
      </div>

      {catalogOpen ? (
        <StudioCatalog
          current={s.engine}
          onSelect={changeEngine}
          onClose={() => setCatalogOpen(false)}
        />
      ) : null}

      {helpOpen ? <StudioHelp onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
};
