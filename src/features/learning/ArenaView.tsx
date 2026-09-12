import React, { useState, useEffect, useRef } from 'react';
import { useLearningStore } from './useLearningStore';
import { useRobotStore } from '../../state/robotStore';
import {
  Search,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Award,
} from 'lucide-react';
import type { Problem, DHParameterRow } from '../../server/db/types';

interface ArenaViewProps {
  onOpenSimulator?: (robotId?: string, pose?: any) => void;
}

interface ProblemActiveViewProps {
  activeProblem: Problem;
  onBack: () => void;
  onOpenSimulator?: (robotId?: string, pose?: any) => void;
}

const ProblemActiveView: React.FC<ProblemActiveViewProps> = ({
  activeProblem,
  onBack,
  onOpenSimulator,
}) => {
  const {
    activeProblemAttempts,
    revealedHints,
    hintLoading,
    requestNextHint,
    submitProblemAttempt,
    submittingAttempt,
    attemptResult,
  } = useLearningStore();

  const currentRobot = useRobotStore((s) => s.robot);
  const currentQ = useRobotStore((s) => s.q);

  const schema = activeProblem.answerSchema;

  // Input states for different answer schemas
  const [scalarInput, setScalarInput] = useState<string>('');
  const [angleInput, setAngleInput] = useState<string>('');
  const [angleUnit, setAngleUnit] = useState<'rad' | 'deg'>('rad');
  const [vectorInput, setVectorInput] = useState<string[]>(() => {
    if (schema.type === 'vector') {
      const len = schema.expectedVector?.length || (schema as any).dimension || 3;
      return Array(len).fill('0');
    }
    return ['0', '0', '0'];
  });
  const [matrixInput, setMatrixInput] = useState<string[][]>(() => {
    if (schema.type === 'matrix') {
      if (schema.expectedMatrix) {
        return schema.expectedMatrix.map((row) => row.map(() => '0'));
      }
      const dim = (schema as any).rowCount || 4;
      return Array.from({ length: dim }, (_, r) =>
        Array.from({ length: dim }, (_, c) => (r === c ? '1' : '0'))
      );
    }
    return [
      ['1', '0', '0', '0'],
      ['0', '1', '0', '0'],
      ['0', '0', '1', '0'],
      ['0', '0', '0', '1'],
    ];
  });
  const [dhTableInput, setDhTableInput] = useState<DHParameterRow[]>(() => {
    if (schema.type === 'dh_table') {
      if (schema.expectedDHTable) {
        return schema.expectedDHTable.map((r, idx) => ({ joint: idx + 1, type: r.type, theta: 0, d: 0, a: 0, alpha: 0 }));
      }
      const count = (schema as any).rowCount || activeProblem.questionData?.dof || 2;
      return Array.from({ length: count }, (_, idx) => ({
        joint: idx + 1,
        type: 'R' as const,
        theta: 0,
        d: 0,
        a: 0,
        alpha: 0,
      }));
    }
    return [
      { joint: 1, type: 'R', theta: 0, d: 0, a: 0.3, alpha: 0 },
      { joint: 2, type: 'R', theta: 0, d: 0, a: 0.2, alpha: 0 },
    ];
  });
  const [jointsInput, setJointsInput] = useState<string[]>(() => {
    if (schema.type === 'joint_config') {
      if (schema.expectedJoints) return schema.expectedJoints.map(() => '0');
      const count = (schema as any).jointCount || (schema as any).rowCount || activeProblem.questionData?.dof || 2;
      return Array(count).fill('0');
    }
    return ['0', '0'];
  });
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProblem) return;

    let answer: any;
    const schema = activeProblem.answerSchema;

    if (schema.type === 'scalar') {
      answer = parseFloat(scalarInput);
    } else if (schema.type === 'angle') {
      const val = parseFloat(angleInput);
      answer = angleUnit === 'deg' ? (val * Math.PI) / 180 : val;
    } else if (schema.type === 'vector') {
      answer = vectorInput.map((v) => parseFloat(v) || 0);
    } else if (schema.type === 'matrix') {
      answer = matrixInput.map((row) => row.map((cell) => parseFloat(cell) || 0));
    } else if (schema.type === 'dh_table') {
      answer = dhTableInput;
    } else if (schema.type === 'joint_config') {
      answer = jointsInput.map((v) => parseFloat(v) || 0);
    }

    const solveTimeMs = Math.max(100, Date.now() - (startTimeRef.current || Date.now()));
    await submitProblemAttempt(answer, solveTimeMs);
  };

  const handleCaptureSimulatorJoints = () => {
    if (currentQ && currentQ.length > 0) {
      setJointsInput(currentQ.map((q) => q.toFixed(4)));
    }
  };

  // 1. Problem Solver View
  const isSolved = activeProblemAttempts.some((a) => a.isCorrect);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-bold text-stone-800 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Problem Arena</span>
          </button>

          <div className="flex items-center gap-2">
            {isSolved && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Solved</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-300">
              {activeProblem.category.toUpperCase()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-950 border border-amber-300">
              {activeProblem.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
              +{activeProblem.xpReward} XP
            </span>
          </div>
        </div>

        {/* Problem Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-stone-300/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {activeProblem.title}
            </h1>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed whitespace-pre-line">
              {activeProblem.description}
            </p>
          </div>

          {/* Given Data Box */}
          {activeProblem.questionData?.givenValues && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Given Parameters & Frame Specifications
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {Object.entries(activeProblem.questionData.givenValues).map(([k, v]) => (
                  <div key={k} className="p-2 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-sans font-medium">{k}: </span>
                    <span className="font-bold text-stone-900">{Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Helpful Action Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={requestNextHint}
              disabled={hintLoading || revealedHints.length >= activeProblem.hints.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {revealedHints.length >= activeProblem.hints.length
                  ? 'All Hints Revealed'
                  : `Request Hint (${revealedHints.length}/${activeProblem.hints.length})`}
              </span>
            </button>

            {onOpenSimulator && (
              <button
                type="button"
                onClick={() => onOpenSimulator(activeProblem.robotConfiguration?.robotId || 'Puma560')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer ml-auto"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Test in 3D Simulator</span>
              </button>
            )}
          </div>

          {/* Revealed Hints */}
          {revealedHints.length > 0 && (
            <div className="space-y-2 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Progressive Guidance Hints</span>
              </div>
              {revealedHints.map((hint, idx) => (
                <div key={idx} className="text-xs text-amber-950 p-2.5 bg-white/80 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-800">Hint {idx + 1}: </span>
                  {hint}
                </div>
              ))}
            </div>
          )}

          {/* Interactive Answer Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-stone-200">
            <div className="text-xs font-black uppercase tracking-wider text-stone-700">
              Submit Your Verified Answer
            </div>

            {/* Schema Type 1: Scalar */}
            {activeProblem.answerSchema.type === 'scalar' && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  required
                  value={scalarInput}
                  onChange={(e) => setScalarInput(e.target.value)}
                  placeholder="Enter numeric result..."
                  className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {activeProblem.answerSchema.unit && (
                  <span className="text-xs font-bold text-stone-600">
                    {activeProblem.answerSchema.unit}
                  </span>
                )}
              </div>
            )}

            {/* Schema Type 2: Angle */}
            {activeProblem.answerSchema.type === 'angle' && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  required
                  value={angleInput}
                  onChange={(e) => setAngleInput(e.target.value)}
                  placeholder="Enter angle value..."
                  className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex rounded-xl border border-stone-300 p-0.5 bg-stone-100 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAngleUnit('rad')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      angleUnit === 'rad' ? 'bg-white shadow-xs text-black' : 'text-stone-600'
                    }`}
                  >
                    Radians
                  </button>
                  <button
                    type="button"
                    onClick={() => setAngleUnit('deg')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      angleUnit === 'deg' ? 'bg-white shadow-xs text-black' : 'text-stone-600'
                    }`}
                  >
                    Degrees
                  </button>
                </div>
              </div>
            )}

            {/* Schema Type 3: Vector */}
            {activeProblem.answerSchema.type === 'vector' && (
              <div className="space-y-2">
                <div className="text-[11px] text-stone-500">Vector Coordinates [{vectorInput.length} components]:</div>
                <div className="flex flex-wrap gap-2">
                  {vectorInput.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-stone-500">
                        {idx === 0 ? 'X:' : idx === 1 ? 'Y:' : idx === 2 ? 'Z:' : `C${idx + 1}:`}
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={val}
                        onChange={(e) => {
                          const copy = [...vectorInput];
                          copy[idx] = e.target.value;
                          setVectorInput(copy);
                        }}
                        className="w-24 px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schema Type 4: Matrix */}
            {activeProblem.answerSchema.type === 'matrix' && (
              <div className="space-y-2">
                <div className="text-[11px] text-stone-500">4x4 Homogeneous Transformation Matrix Elements:</div>
                <div className="overflow-x-auto p-3 bg-stone-50 border border-stone-200 rounded-2xl max-w-lg">
                  <div className="grid grid-cols-4 gap-2">
                    {matrixInput.map((row, r) =>
                      row.map((cell, c) => (
                        <input
                          key={`${r}-${c}`}
                          type="number"
                          step="any"
                          required
                          value={cell}
                          onChange={(e) => {
                            const copy = matrixInput.map((rowCopy) => [...rowCopy]);
                            copy[r][c] = e.target.value;
                            setMatrixInput(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Schema Type 5: DH Table */}
            {activeProblem.answerSchema.type === 'dh_table' && (
              <div className="space-y-2 overflow-x-auto">
                <div className="text-[11px] text-stone-500">
                  Standard DH Parameters (θ in rad, d in m, a in m, α in rad):
                </div>
                <table className="min-w-full text-xs font-mono border-collapse bg-stone-50 rounded-2xl overflow-hidden border border-stone-200">
                  <thead className="bg-stone-200/70 font-bold text-stone-700">
                    <tr>
                      <th className="p-2.5 text-left font-sans">Joint</th>
                      <th className="p-2.5 text-left font-sans">Type</th>
                      <th className="p-2.5 text-left">θ (rad)</th>
                      <th className="p-2.5 text-left">d (m)</th>
                      <th className="p-2.5 text-left">a (m)</th>
                      <th className="p-2.5 text-left">α (rad)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dhTableInput.map((row, idx) => (
                      <tr key={idx} className="border-t border-stone-200">
                        <td className="p-2.5 font-bold font-sans">Joint {row.joint}</td>
                        <td className="p-2.5 font-sans">
                          <select
                            value={row.type}
                            onChange={(e) => {
                              const copy = [...dhTableInput];
                              copy[idx].type = e.target.value as 'R' | 'P';
                              setDhTableInput(copy);
                            }}
                            className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs"
                          >
                            <option value="R">Revolute (R)</option>
                            <option value="P">Prismatic (P)</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="any"
                            value={row.theta}
                            onChange={(e) => {
                              const copy = [...dhTableInput];
                              copy[idx].theta = parseFloat(e.target.value) || 0;
                              setDhTableInput(copy);
                            }}
                            className="w-20 px-2 py-1 rounded bg-white border border-stone-300"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="any"
                            value={row.d}
                            onChange={(e) => {
                              const copy = [...dhTableInput];
                              copy[idx].d = parseFloat(e.target.value) || 0;
                              setDhTableInput(copy);
                            }}
                            className="w-20 px-2 py-1 rounded bg-white border border-stone-300"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="any"
                            value={row.a}
                            onChange={(e) => {
                              const copy = [...dhTableInput];
                              copy[idx].a = parseFloat(e.target.value) || 0;
                              setDhTableInput(copy);
                            }}
                            className="w-20 px-2 py-1 rounded bg-white border border-stone-300"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="any"
                            value={row.alpha}
                            onChange={(e) => {
                              const copy = [...dhTableInput];
                              copy[idx].alpha = parseFloat(e.target.value) || 0;
                              setDhTableInput(copy);
                            }}
                            className="w-20 px-2 py-1 rounded bg-white border border-stone-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Schema Type 6: Joint Configuration (IK) */}
            {activeProblem.answerSchema.type === 'joint_config' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-stone-500">Joint Angles [radians]:</div>
                  <button
                    type="button"
                    onClick={handleCaptureSimulatorJoints}
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Capture from Simulator ({currentRobot.name})</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {jointsInput.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-stone-600">θ{idx + 1}:</span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={val}
                        onChange={(e) => {
                          const copy = [...jointsInput];
                          copy[idx] = e.target.value;
                          setJointsInput(copy);
                        }}
                        className="w-28 px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submittingAttempt}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submittingAttempt ? 'Verifying with Deterministic Engine...' : 'Submit Answer for Validation'}
              </button>
            </div>
          </form>

          {/* Validation Result Banner */}
          {attemptResult && (
            <div
              className={`p-5 rounded-2xl border animate-in fade-in duration-200 space-y-3 ${
                attemptResult.isCorrect
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {attemptResult.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="text-sm font-black">
                    {attemptResult.isCorrect ? 'Correct Solution Verified!' : 'Solution Incorrect'}
                  </div>
                  <p className="text-xs">{attemptResult.feedback}</p>
                  {attemptResult.isCorrect && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 font-bold text-xs text-emerald-800">
                      <span>+{attemptResult.xpAwarded} XP</span>
                      <span>•</span>
                      <span>Rating: {attemptResult.ratingDelta >= 0 ? `+${attemptResult.ratingDelta}` : attemptResult.ratingDelta} ({attemptResult.newRating})</span>
                    </div>
                  )}

                  {/* Badge Unlocked Real-Time Celebration */}
                  {attemptResult.unlockedBadges && attemptResult.unlockedBadges.length > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 rounded-xl space-y-2 mt-2 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-950 uppercase tracking-wider">
                        <Award className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                        <span>Achievement Unlocked! New Badge Earned</span>
                      </div>
                      <div className="space-y-1.5">
                        {attemptResult.unlockedBadges.map((badge: any) => (
                          <div
                            key={badge.id}
                            className="flex items-center justify-between text-xs bg-white/90 p-2 rounded-lg border border-amber-200"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-stone-900">{badge.name}</div>
                              <div className="text-[10px] text-stone-600">{badge.description}</div>
                            </div>
                            <div className="text-[10px] font-black text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0 ml-2">
                              +{badge.xpReward} XP • {badge.rarity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Revealed Solution Derivation on correct */}
              {attemptResult.solution && (
                <div className="p-4 bg-white/90 border border-emerald-200 rounded-xl space-y-2 mt-3">
                  <div className="text-xs font-black uppercase text-emerald-800">
                    Step-by-Step Mathematical Derivation
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-stone-800 font-medium">
                    {attemptResult.solution.derivationSteps.map((step: string, sIdx: number) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ol>
                  <div className="pt-2 text-xs font-bold text-stone-900 border-t border-stone-200">
                    Result: {attemptResult.solution.finalAnswerDescription}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Past Attempts Table */}
          {activeProblemAttempts.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-stone-200">
              <div className="text-xs font-black uppercase tracking-wider text-stone-600">
                Your Attempt History
              </div>
              <div className="space-y-1.5">
                {activeProblemAttempts.map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-600">Attempt #{activeProblemAttempts.length - idx}</span>
                      {att.isCorrect ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-bold text-[10px]">
                          Correct
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-950 font-bold text-[10px]">
                          Incorrect
                        </span>
                      )}
                    </div>
                    <div className="text-stone-500 text-[11px]">
                      {new Date(att.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
};

export const ArenaView: React.FC<ArenaViewProps> = ({ onOpenSimulator }) => {
  const {
    problems,
    problemsLoading,
    activeProblem,
    fetchProblems,
    selectProblem,
    categoryFilter,
    setCategoryFilter,
    difficultyFilter,
    setDifficultyFilter,
    searchQuery,
    setSearchQuery,
  } = useLearningStore();

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 30;
  const [prevFilterKey, setPrevFilterKey] = useState<string>('');
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 whenever search, category, or difficulty filter changes (render-phase adjustment)
  const currentFilterKey = `${categoryFilter}|${difficultyFilter}|${searchQuery}`;
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  const totalProblems = problems.length;
  const totalPages = Math.max(1, Math.ceil(totalProblems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalProblems);
  const displayedProblems = problems.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(clamped);
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPaginationRange = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  if (activeProblem) {
    return (
      <ProblemActiveView
        key={activeProblem.id}
        activeProblem={activeProblem}
        onBack={() => selectProblem(null)}
        onOpenSimulator={onOpenSimulator}
      />
    );
  }

  const categories = [
    { id: '', label: 'All Categories' },
    { id: 'transforms', label: 'Transforms & Math' },
    { id: 'dh', label: 'DH Parameters' },
    { id: 'fk', label: 'Forward Kinematics' },
    { id: 'ik', label: 'Inverse Kinematics' },
    { id: 'jacobians', label: 'Differential & Jacobians' },
    { id: 'dynamics', label: 'Dynamics & Lagrangian' },
    { id: 'control', label: 'Motion & Torque Control' },
    { id: 'mobile', label: 'Wheeled Mobile Robots' },
    { id: 'trajectory', label: 'Trajectory Planning' },
    { id: 'workspace', label: 'Workspace Analysis' },
  ];

  const difficulties = [
    { id: '', label: 'All Difficulties' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'expert', label: 'Expert' },
  ];

  // 2. Problem Catalog Grid View
  return (
    <div ref={catalogTopRef} className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <Target className="w-6 h-6 text-amber-600" />
            <span>KyntriX Problem Arena</span>
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Rigorous, deterministic robotics kinematics and transformation problems from beginner to research levels.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems, tags..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === cat.id
                ? 'bg-black text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Difficulty Filter */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-stone-500 font-bold uppercase text-[10px] mr-1">Difficulty:</span>
        {difficulties.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDifficultyFilter(d.id)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              difficultyFilter === d.id
                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                : 'text-stone-600 hover:text-black'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Catalog Status Bar */}
      <div className="flex items-center justify-between pt-1 text-xs text-stone-600 font-medium">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-stone-900 font-black">{totalProblems > 0 ? startIndex + 1 : 0}–{endIndex}</strong> of{' '}
            <strong className="text-stone-900 font-black">{totalProblems}</strong> problems
          </span>
          {totalPages > 1 && (
            <span className="text-stone-400 text-[11px] font-mono">
              (Page {safeCurrentPage} of {totalPages})
            </span>
          )}
        </div>
      </div>

      {/* Problems Grid */}
      {problemsLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-white/80 border border-stone-200 rounded-3xl p-12 text-center">
          <Target className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No matching problems found</h3>
          <p className="text-xs text-stone-600 mt-1">Try clearing filters or search query to view all problems.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProblems.map((problem) => (
              <div
                key={problem.id}
                className="bg-white/95 backdrop-blur-xl border border-stone-200/90 hover:border-amber-400/80 rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200">
                      {problem.category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        problem.difficulty === 'beginner'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : problem.difficulty === 'intermediate'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-xs font-black text-amber-600">+{problem.xpReward} XP</span>
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-amber-600 transition-colors leading-snug">
                    {problem.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                    {problem.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{problem.timeLimitSeconds ? `${Math.round(problem.timeLimitSeconds / 60)} min` : 'Self-paced'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectProblem(problem.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span>Solve</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Amazon-Style Numbered Pagination Controls */}
          {totalPages > 1 && (
            <nav
              aria-label="Problem Catalog Pagination"
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stone-200/80"
            >
              <div className="text-xs text-stone-500 font-medium order-2 sm:order-1">
                Showing page <span className="font-black text-stone-900">{safeCurrentPage}</span> of{' '}
                <span className="font-black text-stone-900">{totalPages}</span> ({totalProblems} problems total)
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-bold text-stone-800 transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  aria-label="Go to Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                {getPaginationRange().map((item, idx) =>
                  item === '...' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs font-bold text-stone-400 select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => handlePageChange(item as number)}
                      className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        safeCurrentPage === item
                          ? 'bg-stone-900 text-white shadow-xs scale-105'
                          : 'bg-white hover:bg-stone-100 text-stone-700 hover:text-black border border-stone-200/90'
                      }`}
                      aria-current={safeCurrentPage === item ? 'page' : undefined}
                      aria-label={`Page ${item}`}
                    >
                      {item}
                    </button>
                  )
                )}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-bold text-stone-800 transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  aria-label="Go to Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
