import React, { useState, useRef, useEffect } from 'react';
import { useRobotStore } from '../../state/robotStore';
import {
  sampleWorkspace,
  MAX_WORKSPACE_POINTS,
  type WorkspaceSampleResult,
  type WorkspaceWorkerRequest,
  type WorkspaceWorkerResponse,
  type WorkspaceWorkerProgress,
} from '../../workers/workspaceWorker';
import { Play, Trash2, Loader2, AlertCircle, CheckCircle2, Sliders, X } from 'lucide-react';

export const WorkspaceStudio: React.FC = () => {
  const { robot, setWorkspacePoints, clearWorkspacePoints, workspacePoints, setAnnouncement } = useRobotStore();
  const [resolution, setResolution] = useState<number>(15);
  const [isSampling, setIsSampling] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [sampleResult, setSampleResult] = useState<WorkspaceSampleResult | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef<number>(0);

  // Calculate estimated points and effective resolution for current robot DOF
  const n = robot.joints.length;
  const theoreticalPoints = Math.pow(resolution, n);
  const willAutoReduce = theoreticalPoints > MAX_WORKSPACE_POINTS;
  const effectiveRes = willAutoReduce
    ? Math.max(2, Math.floor(Math.pow(MAX_WORKSPACE_POINTS, 1 / n)))
    : resolution;
  const effectivePoints = Math.pow(effectiveRes, n);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleCancelSampling = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsSampling(false);
    setProgressPercent(0);
    setAnnouncement('Workspace sampling cancelled.');
  };

  const handleStartSampling = () => {
    setIsSampling(true);
    setProgressPercent(0);
    setAnnouncement(`Starting workspace sampling for ${robot.name}...`);
    const reqId = ++reqIdRef.current;

    // Use Web Worker if available, fallback to synchronous
    if (typeof Worker !== 'undefined') {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('../../workers/workspaceWorker.ts', import.meta.url),
            { type: 'module' }
          );
        }

        const worker = workerRef.current;

        worker.onmessage = (
          e: MessageEvent<WorkspaceWorkerResponse | WorkspaceWorkerProgress>
        ) => {
          if (e.data.id !== reqId) return;

          if (e.data.type === 'progress') {
            setProgressPercent(e.data.percent);
          } else if (e.data.type === 'result') {
            setSampleResult(e.data.result);
            setWorkspacePoints(e.data.result.points);
            setIsSampling(false);
            setProgressPercent(100);
            setAnnouncement(`Workspace sampling complete: ${e.data.result.points.length} reachable points sampled.`);
          }
        };

        worker.onerror = (err) => {
          console.warn('Workspace worker error, falling back to sync:', err);
          runSynchronousFallback();
        };

        const req: WorkspaceWorkerRequest = {
          id: reqId,
          robot,
          resolution,
        };
        worker.postMessage(req);
        return;
      } catch (err) {
        console.warn('Worker creation failed, falling back to sync:', err);
      }
    }

    runSynchronousFallback();
  };

  const runSynchronousFallback = () => {
    setTimeout(() => {
      const res = sampleWorkspace(robot, resolution, (p) => setProgressPercent(p));
      setSampleResult(res);
      setWorkspacePoints(res.points);
      setIsSampling(false);
      setProgressPercent(100);
      setAnnouncement(`Workspace sampling complete: ${res.points.length} reachable points sampled.`);
    }, 10);
  };

  const handleClear = () => {
    clearWorkspacePoints();
    setSampleResult(null);
    setProgressPercent(0);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-4">
      {/* Studio Header Alert */}
      <div className="flex items-start gap-3 p-4 bg-white border-2 border-stone-200 rounded-2xl text-xs text-black shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-black uppercase tracking-wide">
              Sampled workspace (estimated, not exact boundary)
            </span>
          </div>
          <p className="text-stone-700 text-xs leading-relaxed font-medium">
            Workspace sampling computes a multi-dimensional kinematic grid across all joint ranges to discover reachable Cartesian positions. Points are rendered in the 3D viewport as an amber point cloud.
          </p>
        </div>
      </div>

      {/* Control Card */}
      <div className="p-5 bg-white border-2 border-stone-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-black" />
            <h3 className="text-xs font-black text-black uppercase tracking-wider">
              Sampling Grid Configuration
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-stone-600">
            {robot.name} ({n}-DOF)
          </span>
        </div>

        {/* Resolution Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="workspace-res-slider" className="font-black text-black">
              Resolution (Steps per joint):{' '}
              <span className="font-mono text-amber-700">{resolution}</span>
            </label>
            <span className="text-[11px] font-mono text-stone-600">
              {willAutoReduce ? (
                <span className="text-amber-700 font-bold">
                  Auto-reduced to {effectiveRes} steps ({effectivePoints.toLocaleString()} points max)
                </span>
              ) : (
                <span>Est. points: {theoreticalPoints.toLocaleString()}</span>
              )}
            </span>
          </div>

          <input
            id="workspace-res-slider"
            type="range"
            min={3}
            max={25}
            step={1}
            value={resolution}
            disabled={isSampling}
            onChange={(e) => setResolution(parseInt(e.target.value, 10))}
            aria-label="Workspace grid resolution steps per joint"
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
          />

          <div className="flex justify-between text-[10px] text-stone-500 font-mono">
            <span>Fast (3 steps)</span>
            <span>Default (15 steps)</span>
            <span>Dense (25 steps)</span>
          </div>
        </div>

        {/* Progress Bar (Visible during sampling) */}
        {isSampling && (
          <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-300 rounded-xl">
            <div className="flex justify-between text-xs font-black text-black">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                <span>Computing Forward Kinematics Grid...</span>
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-amber-200/80 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleStartSampling}
            disabled={isSampling}
            aria-label="Sample Workspace"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-98 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-stone-900 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSampling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Sampling Workspace ({progressPercent}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Sample Workspace</span>
              </>
            )}
          </button>

          {isSampling ? (
            <button
              onClick={handleCancelSampling}
              aria-label="Cancel Workspace Sampling"
              className="flex items-center gap-1.5 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Cancel Sampling</span>
            </button>
          ) : (
            <button
              onClick={handleClear}
              disabled={!workspacePoints}
              aria-label="Clear Workspace Point Cloud"
              className="flex items-center gap-1.5 px-4 py-3 bg-white hover:bg-rose-50 border-2 border-stone-300 hover:border-rose-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash2 className="w-4 h-4 text-rose-700" />
              <span>Clear Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Telemetry Card */}
      {sampleResult && (
        <div className="p-5 bg-white border-2 border-stone-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-black uppercase tracking-wider">
                Sampling Results & Bounding Volume
              </h3>
            </div>
            <span className="text-[11px] font-mono text-stone-600 font-bold">
              Computed in {sampleResult.durationMs.toFixed(0)} ms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="text-[10px] uppercase font-bold text-stone-500">Total Points</div>
              <div className="text-base font-black font-mono text-black">
                {sampleResult.totalPoints.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="text-[10px] uppercase font-bold text-stone-500">Span X (Width)</div>
              <div className="text-base font-black font-mono text-black">
                {sampleResult.bbox.dimensions[0].toFixed(3)} m
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="text-[10px] uppercase font-bold text-stone-500">Span Y (Depth)</div>
              <div className="text-base font-black font-mono text-black">
                {sampleResult.bbox.dimensions[1].toFixed(3)} m
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="text-[10px] uppercase font-bold text-stone-500">Span Z (Height)</div>
              <div className="text-base font-black font-mono text-black">
                {sampleResult.bbox.dimensions[2].toFixed(3)} m
              </div>
            </div>
          </div>

          {/* Bounding Box Coordinates */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs font-mono">
            <div className="font-black text-black uppercase text-[10px] tracking-wider">
              Bounding Box Coordinates [X, Y, Z]
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-stone-500 font-bold">Min:</span>{' '}
                <span className="text-black font-black">
                  [{sampleResult.bbox.min.map((v) => v.toFixed(3)).join(', ')}] m
                </span>
              </div>
              <div>
                <span className="text-stone-500 font-bold">Max:</span>{' '}
                <span className="text-black font-black">
                  [{sampleResult.bbox.max.map((v) => v.toFixed(3)).join(', ')}] m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceStudio;
