import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { Matrix4 } from '../../robotics/math/Matrix4';
import { forwardKinematics } from '../../robotics/kinematics/forwardKinematics';
import { solveSMABFGSIK } from '../../robotics/ik/smaBfgs/smaBfgsSolver';
import type { SMABFGSSolverOptions, SMABFGSSolution } from '../../robotics/ik/smaBfgs/types';
import { RobotSetupSection } from './components/RobotSetupSection';
import { TargetDefinitionSection } from './components/TargetDefinitionSection';
import { SolverConfigSection } from './components/SolverConfigSection';
import { ConvergencePlotSection } from './components/ConvergencePlotSection';
import { ValidationSection } from './components/ValidationSection';
import { StepExecutionSection } from './components/StepExecutionSection';
import { MathExplanationSection } from './components/MathExplanationSection';
import { TrajectoryPlaybackSection } from './components/TrajectoryPlaybackSection';
import {
  Dna,
  Sliders,
  ListOrdered,
  GraduationCap,
} from 'lucide-react';

export const SmaBfgsStudio: React.FC = () => {
  const robot = useRobotStore((s) => s.robot);
  const storeQ = useRobotStore((s) => s.q);
  const storeTargetPose = useRobotStore((s) => s.targetPose);
  const setJoints = useRobotStore((s) => s.setJoints);
  const setTargetPose = useRobotStore((s) => s.setTargetPose);
  const setAnnouncement = useRobotStore((s) => s.setAnnouncement);
  const selectRobot = useRobotStore((s) => s.selectRobot);

  // Local state for target pose and solver options
  const [targetPose, setLocalTargetPose] = useState<Matrix4>(() => storeTargetPose.clone());
  const [solverOptions, setSolverOptions] = useState<SMABFGSSolverOptions>({
    populationSize: 30,
    smaIterations: 40,
    bfgsIterations: 50,
    positionWeight: 1.0,
    orientationWeight: 0.2,
    positionOnly: robot.dof < 6,
    positionTolerance: 1e-4,
    orientationTolerance: 1e-3,
    randomSeed: 42,
    gradientMethod: 'analytical',
    boundStrategy: 'sigmoid-transform',
  });

  const [activeTab, setActiveTab] = useState<'workspace' | 'trace' | 'theory'>('workspace');
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solution, setSolution] = useState<SMABFGSSolution | null>(null);

  // Available robot switch list
  const availableRobots = useMemo(
    () => [
      { id: 'Puma560', name: 'Puma 560 (6R Industrial)' },
      { id: 'ABBIRB120', name: 'ABB IRB 120 (6R Compact)' },
      { id: 'KukaKR5', name: 'KUKA KR 5 (6R Articulated)' },
      { id: 'FanucM10iA', name: 'Fanuc M-10iA (6R Articulated)' },
      { id: 'MTAB_Mini', name: 'MTAB Mini (5R Educational)' },
      { id: 'EpsonC3A60CT', name: 'Epson C3 (6R Compact)' },
      { id: 'Stanford', name: 'Stanford Arm (RRP Spherical)' },
    ],
    []
  );

  // Update positionOnly when robot changes
  useEffect(() => {
    setSolverOptions((prev) => ({
      ...prev,
      positionOnly: robot.dof < 6 ? true : prev.positionOnly,
      initialGuess: robot.joints.map((j) => j.home ?? (j.min + j.max) / 2),
    }));
  }, [robot]);

  // Execute solver
  const handleSolve = useCallback(() => {
    setIsSolving(true);
    setAnnouncement(`Solving IK for ${robot.name} with SMA-BFGS Hybrid Solver...`);

    // Allow UI to render loading state before heavy optimization loop
    setTimeout(() => {
      try {
        const sol = solveSMABFGSIK(robot, targetPose, solverOptions);
        setSolution(sol);
        setAnnouncement(
          `SMA-BFGS IK complete: ${sol.validation.status}. Position error: ${sol.validation.positionErrorMm.toFixed(3)} mm.`
        );
      } catch (err) {
        console.error('SMA-BFGS Solve error:', err);
        setAnnouncement('Solver encountered a numerical failure.');
      } finally {
        setIsSolving(false);
      }
    }, 10);
  }, [robot, targetPose, solverOptions, setAnnouncement]);

  // Run initial solve on mount or when target/robot changes if no solution yet
  useEffect(() => {
    if (!solution || solution.robot.id !== robot.id) {
      handleSolve();
    }
  }, [robot.id]);

  const handleApplyToRobot = (q: number[]) => {
    setJoints(q);
    setAnnouncement(`Applied SMA-BFGS solution to 3D robot (${robot.name}).`);
  };

  const handleUseCurrentPose = () => {
    const fk = forwardKinematics(robot, storeQ);
    const currPose = fk.endEffectorTransform.clone();
    setLocalTargetPose(currPose);
    setTargetPose(currPose);
    setAnnouncement('Target synced to current robot end-effector pose.');
  };

  const handleSampleReachable = () => {
    // Generate random joint angles strictly within limits
    const randQ = robot.joints.map((j) => {
      const min = j.min + 0.1 * (j.max - j.min);
      const max = j.max - 0.1 * (j.max - j.min);
      return min + Math.random() * (max - min);
    });
    const fk = forwardKinematics(robot, randQ);
    const reachablePose = fk.endEffectorTransform.clone();
    setLocalTargetPose(reachablePose);
    setTargetPose(reachablePose);
    setAnnouncement('Sampled guaranteed reachable target within robot workspace.');
  };

  const handleChangeOptions = (updated: Partial<SMABFGSSolverOptions>) => {
    setSolverOptions((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectRobot = async (robotId: string) => {
    try {
      await selectRobot(robotId);
      setAnnouncement(`Loaded ${robotId} for SMA-BFGS optimization.`);
    } catch (err) {
      console.error('Failed to load robot:', err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-7xl mx-auto pb-12">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>SMA-BFGS Quasi-Newton IK Solver</span>
              <span className="text-[10px] uppercase font-black tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                Hybrid Optimization
              </span>
            </h1>
            <p className="text-xs text-stone-600 font-medium">
              Global bio-foraging metaheuristic exploration + Superlinear Quasi-Newton local descent
            </p>
          </div>
        </div>

        {/* Studio Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-xl font-bold text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'workspace'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Solver Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'trace'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>9-Step Trace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'theory'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Theory & Proofs</span>
          </button>
        </div>
      </div>

      {/* Main Studio Views */}
      {activeTab === 'workspace' && (
        <div className="space-y-4">
          {/* Section 1: Active Robot */}
          <RobotSetupSection
            robot={robot}
            onSelectRobot={handleSelectRobot}
            availableRobots={availableRobots}
          />

          {/* Section 2: Target Definition */}
          <TargetDefinitionSection
            targetPose={targetPose}
            onChangeTarget={(t) => {
              setLocalTargetPose(t);
              setTargetPose(t);
            }}
            onUseCurrentPose={handleUseCurrentPose}
            onSampleReachable={handleSampleReachable}
            positionOnly={solverOptions.positionOnly ?? false}
          />

          {/* Section 3: Solver Hyperparameters */}
          <SolverConfigSection
            options={solverOptions}
            onChangeOptions={handleChangeOptions}
            onSolve={handleSolve}
            isSolving={isSolving}
          />

          {/* Section 4 & 5: Live Solution Validation & Telemetry (Rendered when solution exists) */}
          {solution && (
            <>
              <ValidationSection
                solution={solution}
                onApplyToRobot={handleApplyToRobot}
              />

              <ConvergencePlotSection solution={solution} />

              <TrajectoryPlaybackSection
                solution={solution}
                onPreviewJoints={(q) => setJoints(q)}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'trace' && solution && (
        <StepExecutionSection solution={solution} />
      )}

      {activeTab === 'theory' && (
        <MathExplanationSection />
      )}
    </div>
  );
};
