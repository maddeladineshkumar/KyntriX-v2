import { useState, useEffect, useRef, useCallback } from 'react';
import { useRobotStore } from './state/robotStore';
import { Viewport3D } from './features/viewport/Viewport3D';
import { JointControlPanel } from './features/control/JointControlPanel';
import { DHTableStudio } from './features/dh/DHTableStudio';
import { TransformationStudio } from './features/transform/TransformationStudio';
import { IKStudio } from './features/ik/IKStudio';
import { TrajectoryStudio } from './features/trajectory/TrajectoryStudio';
import { AnalysisStudio } from './features/analysis/AnalysisStudio';
import { CustomRobotCreator } from './features/custom/CustomRobotCreator';
import { RobotCatalogModal } from './features/catalog/RobotCatalogModal';
import { WorkspaceStudio } from './features/workspace/WorkspaceStudio';
import {
  Sliders,
  Crosshair,
  Table,
  LineChart,
  MoveUpRight,
  Wrench,
  AlertTriangle,
  Square,
  Bot,
  Activity,
  Layers,
  X,
  RotateCcw,
  Box,
  Download,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type StudioModal = 'dh' | 'transform' | 'custom' | 'trajectory' | 'analysis' | 'workspace' | null;

const KinematicFeasibilityBadge: React.FC = () => {
  const jacobian = useRobotStore((s) => s.jacobian);
  const isSingular = jacobian.isSingular;
  const manipulability = jacobian.manipulability;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 ${
        isSingular
          ? 'bg-amber-100 text-amber-950 border-amber-300'
          : 'bg-emerald-100 text-emerald-950 border-emerald-300'
      }`}
    >
      {isSingular ? (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Singularity</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
          <span>Feasible (w={manipulability.toFixed(3)})</span>
        </>
      )}
    </div>
  );
};

export function App() {
  const {
    robot,
    activeTab,
    setActiveTab,
    activeTrajectory,
    playback,
    pauseTrajectory,
    seekTrajectory,
    resetToHome,
  } = useRobotStore();

  // Onboarding wizard opens on launch as requested
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [topTab, setTopTab] = useState<'simulate' | 'trajectory'>('simulate');
  const [activeModal, setActiveModal] = useState<StudioModal>(null);
  const [showJointDrawer, setShowJointDrawer] = useState(false);
  const [showIKDrawer, setShowIKDrawer] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const prevDialogOpenRef = useRef(false);

  const isAnyDialogOpen = !!activeModal || showJointDrawer || showIKDrawer || catalogOpen;

  // Accessibility (PRD §55): Return focus to trigger button when modal/drawer closes
  useEffect(() => {
    if (isAnyDialogOpen && !prevDialogOpenRef.current) {
      if (document.activeElement && document.activeElement !== document.body) {
        lastTriggerRef.current = document.activeElement as HTMLElement;
      }
    } else if (!isAnyDialogOpen && prevDialogOpenRef.current) {
      if (lastTriggerRef.current && typeof lastTriggerRef.current.focus === 'function') {
        const trigger = lastTriggerRef.current;
        lastTriggerRef.current = null;
        setTimeout(() => trigger.focus(), 20);
      }
    }
    prevDialogOpenRef.current = isAnyDialogOpen;
  }, [isAnyDialogOpen]);

  // Accessibility: Move focus inside dialog when opened
  useEffect(() => {
    if (activeModal || showJointDrawer || showIKDrawer) {
      const timer = setTimeout(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        if (dialog) {
          const firstFocusable = dialog.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            dialog.focus();
          }
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [activeModal, showJointDrawer, showIKDrawer]);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    const promptEvent = installPrompt;
    setInstallPrompt(null);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // Ignored if prompt was cancelled
    }
  };

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setActiveTab('fk');
  }, [setActiveTab]);

  const handleFocusTrap = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Tab') {
      const focusableEls = e.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }
  };

  // Synchronize store activeTab with App modal/top-tab state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'catalog') {
        setCatalogOpen(true);
        setActiveModal(null);
      } else {
        setCatalogOpen(false);
        if (activeTab === 'fk') {
          setActiveModal(null);
        } else if (activeTab === 'ik') {
          setShowIKDrawer(true);
          setShowJointDrawer(false);
          setActiveModal(null);
        } else if (activeTab === 'trajectory' || activeTab === 'analysis') {
          setTopTab('trajectory');
          setActiveModal(activeTab);
        } else if (['dh', 'transform', 'custom', 'workspace'].includes(activeTab)) {
          setTopTab('simulate');
          setShowIKDrawer(false);
          setActiveModal(activeTab as StudioModal);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Handle ESC key to close open pop-up modals or side drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showIKDrawer) {
          setShowIKDrawer(false);
          setActiveTab('fk');
        } else if (showJointDrawer) {
          setShowJointDrawer(false);
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIKDrawer, showJointDrawer, setActiveTab, closeModal]);

  const handleSelectTopTab = (tab: 'simulate' | 'trajectory') => {
    setTopTab(tab);
    // When switching top mode, close any open modal from previous mode if not applicable
    if (tab === 'simulate' && (activeModal === 'trajectory' || activeModal === 'analysis')) {
      closeModal();
    } else if (tab === 'trajectory' && activeModal !== 'trajectory' && activeModal !== 'analysis') {
      closeModal();
    }
  };

  const handleToggleModal = (modal: StudioModal) => {
    if (activeModal === modal) {
      closeModal();
    } else {
      setActiveModal(modal);
      if (modal) {
        setActiveTab(modal);
      }
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#f7f4ed] text-stone-900 overflow-hidden font-sans select-none antialiased">
      {/* 1. Ultra-Clean Top Bar - Exactly and ONLY TWO Primary Buttons as instructed */}
      <header className="relative flex flex-col items-center justify-center px-6 py-2 bg-[#f7f4ed]/95 backdrop-blur-2xl border-b border-stone-300/80 z-30 shrink-0 shadow-xs">
        {/* Permanent KYNTRIX Wordmark - Top Left */}
        <div className="absolute left-3.5 sm:left-6 top-2 sm:top-3 flex items-center z-40 select-none pointer-events-auto">
          <picture>
            <source srcSet="/wordmark.webp" type="image/webp" />
            <img
              src="/wordmark.png"
              alt="KYNTRIX"
              className="h-6 sm:h-7 md:h-8 w-auto object-contain cursor-default"
              draggable={false}
            />
          </picture>
        </div>

        {/* Native PWA Install Prompt Button */}
        {installPrompt && (
          <button
            onClick={handleInstallApp}
            aria-label="Install KYNTRIX application"
            title="Install KYNTRIX as desktop/mobile app"
            className="absolute right-4 top-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* Top-Level Mode Selector */}
        <div className="flex items-center gap-3 p-1.5 bg-white/90 backdrop-blur-xl rounded-2xl border-2 border-stone-200/90 shadow-md">
          {/* Button 1: Simulate Kinematics */}
          <button
            onClick={() => handleSelectTopTab('simulate')}
            aria-label="Simulate Kinematics Mode"
            className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              topTab === 'simulate'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Sliders className={`w-4 h-4 ${topTab === 'simulate' ? 'text-white' : 'text-stone-700'}`} />
            <span>Simulate Kinematics</span>
          </button>

          {/* Button 2: Trajectory Analysis */}
          <button
            onClick={() => handleSelectTopTab('trajectory')}
            aria-label="Trajectory Analysis Mode"
            className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              topTab === 'trajectory'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Activity className={`w-4 h-4 ${topTab === 'trajectory' ? 'text-white' : 'text-stone-700'}`} />
            <span>Trajectory Analysis</span>
          </button>
        </div>

        {/* Revealing Feature Toolbar - Application buttons that pop-up their respective studio windows */}
        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-stone-200/70 overflow-x-auto max-w-full">
          {topTab === 'simulate' && (
            <>
              {/* FK Joint Jogger Toggle */}
              <button
                onClick={() => setShowJointDrawer((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  showJointDrawer
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Joint Jogger {showJointDrawer ? '●' : '▾'}</span>
              </button>

              {/* IK Target Solver Right-Side Drawer Button */}
              <button
                onClick={() => {
                  if (showIKDrawer) {
                    setShowIKDrawer(false);
                    setActiveTab('fk');
                  } else {
                    setShowIKDrawer(true);
                    setShowJointDrawer(false);
                    setActiveTab('ik');
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  showIKDrawer
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>IK Target Solver {showIKDrawer ? '●' : '▾'}</span>
              </button>

              {/* DH Parameters & Simulation Studio Pop-up */}
              <button
                onClick={() => handleToggleModal('dh')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'dh'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>DH Simulation Studio</span>
              </button>

              {/* Matrices A & T Pop-up */}
              <button
                onClick={() => handleToggleModal('transform')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'transform'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Matrices A & T</span>
              </button>

              {/* Reachable Workspace Point Cloud Studio Pop-up */}
              <button
                onClick={() => handleToggleModal('workspace')}
                aria-label="Reachable Workspace Point Cloud Studio"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'workspace'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Workspace Studio</span>
              </button>

              {/* Custom Arm Creator Pop-up */}
              <button
                onClick={() => handleToggleModal('custom')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'custom'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Custom Serial Arm</span>
              </button>
            </>
          )}

          {topTab === 'trajectory' && (
            <>
              {/* Trajectory Planner Pop-up */}
              <button
                onClick={() => handleToggleModal('trajectory')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'trajectory'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <MoveUpRight className="w-3.5 h-3.5" />
                <span>Trajectory Planner & Playback</span>
              </button>

              {/* Dynamic Telemetry & Plots Pop-up */}
              <button
                onClick={() => handleToggleModal('analysis')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'analysis'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Dynamic Telemetry & Plots</span>
              </button>

              {/* FK Joint Jogger Toggle */}
              <button
                onClick={() => setShowJointDrawer((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  showJointDrawer
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Joint Controls {showJointDrawer ? '●' : '▾'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Main Expansive 3D Simulation Canvas - Full Width Workspace */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#f7f4ed]">
        <Viewport3D isPaused={!!activeModal} />

        {/* Floating Tactile Joint Jogger Drawer (Slides in on demand, never squishing the scene) */}
        {showJointDrawer && (
          <div
            role="dialog"
            aria-label="Joint Actuation Panel"
            onKeyDown={handleFocusTrap}
            className="absolute top-4 right-4 bottom-24 z-20 w-88 lg:w-96 bg-white/95 backdrop-blur-2xl border-2 border-stone-300/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-black" />
                <span className="text-xs font-black text-black uppercase tracking-wide">Joint Actuation</span>
                <span className="text-[10px] px-2 py-0.5 bg-stone-200 text-black font-bold rounded-md">
                  {robot.dof} DOF
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowJointDrawer(false);
                    setShowIKDrawer(true);
                    setActiveTab('ik');
                  }}
                  title="Switch to IK Target Solver"
                  className="px-2 py-1 text-[11px] font-black text-stone-700 hover:text-black hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 cursor-pointer"
                >
                  IK Solver ➔
                </button>
                <button
                  onClick={() => setShowJointDrawer(false)}
                  className="p-1 rounded-xl text-stone-500 hover:text-black hover:bg-stone-200/80 transition-colors cursor-pointer"
                  aria-label="Close Joint Actuation Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <JointControlPanel />
            </div>
          </div>
        )}

        {/* Floating Tactile IK Target Solver Drawer (Positioned exclusively on the right side) */}
        {showIKDrawer && (
          <div
            role="dialog"
            aria-label="Inverse Kinematics Target Solver"
            onKeyDown={handleFocusTrap}
            className="absolute top-4 right-4 bottom-24 z-20 w-96 md:w-[450px] lg:w-[490px] max-w-[calc(100vw-32px)] bg-white/98 backdrop-blur-2xl border-2 border-stone-300/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-400 text-black border border-stone-900 shadow-2xs">
                  <Crosshair className="w-4 h-4 text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-black uppercase tracking-wide">IK Target Solver</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-black font-black rounded-md border border-amber-300">
                      {robot.name} ({robot.dof} DOF)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowIKDrawer(false);
                    setShowJointDrawer(true);
                    setActiveTab('fk');
                  }}
                  title="Switch to Joint Controls"
                  className="px-2 py-1 text-[11px] font-black text-stone-700 hover:text-black hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 cursor-pointer"
                >
                  Joints ➔
                </button>
                <button
                  onClick={() => {
                    setShowIKDrawer(false);
                    setActiveTab('fk');
                  }}
                  className="p-1 rounded-xl text-stone-500 hover:text-black hover:bg-stone-200/80 transition-colors cursor-pointer"
                  aria-label="Close Inverse Kinematics Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <IKStudio />
            </div>
          </div>
        )}

        {/* Sleek Floating Glassmorphic Dock in 3D Viewport */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 bg-white/95 backdrop-blur-2xl border-2 border-stone-300/80 rounded-2xl shadow-xl whitespace-nowrap">
          {/* Robot Model Selector Pill */}
          <button
            onClick={() => setCatalogOpen(true)}
            title="Click to change robot model or view catalog"
            aria-label={`Current robot model: ${robot.name}. Click to change model.`}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-all group cursor-pointer shrink-0"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-200 animate-pulse shrink-0" />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Bot className="w-3.5 h-3.5 text-black shrink-0" />
              <span className="text-xs font-black text-black">{robot.name}</span>
              <span className="text-[10px] text-stone-600 font-bold">({robot.dof} DOF)</span>
            </div>
            <span className="text-[10px] font-black text-black bg-white px-2 py-0.5 rounded border border-stone-300 ml-1 shrink-0">
              Change Model ▾
            </span>
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={() => {
              pauseTrajectory();
              seekTrajectory(0);
            }}
            title="Emergency Stop: Halt simulation immediately"
            aria-label="Emergency Stop Simulation"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 ${
              activeTrajectory && playback.isPlaying
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/30 animate-pulse'
                : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300'
            }`}
          >
            <Square className={`w-3.5 h-3.5 ${activeTrajectory && playback.isPlaying ? 'fill-white' : 'fill-rose-950'}`} />
            <span>■ STOP</span>
          </button>

          {/* Singularity / Feasibility Telemetry Badge */}
          <KinematicFeasibilityBadge />

          {/* Reset to Home Button */}
          <button
            onClick={resetToHome}
            title="Reset Robot Pose to Calibrated Home Pose"
            aria-label="Reset to Home Pose"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-black" />
            <span>Home</span>
          </button>

          {/* Quick Joint Controls Drawer Toggle */}
          <button
            onClick={() => setShowJointDrawer((prev) => !prev)}
            title="Toggle Joint Controls Panel"
            aria-label="Toggle Joint Controls Drawer"
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              showJointDrawer
                ? 'bg-black text-white border-black'
                : 'bg-stone-100 text-black border-stone-300 hover:bg-stone-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Revealing Application Pop-up Studios (Spacious, Zero-Overflow, 10/10 Desktop Class) */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            activeModal === 'dh'
              ? 'Denavit-Hartenberg Parameters Table Studio'
              : activeModal === 'transform'
              ? 'Homogeneous Transformation Matrix Studio'
              : activeModal === 'custom'
              ? 'Custom Robot Architecture Synthesizer'
              : activeModal === 'trajectory'
              ? 'Trajectory Planning and Simulation Studio'
              : activeModal === 'analysis'
              ? 'Dynamic Telemetry and Kinematic Plots Studio'
              : 'Reachable Workspace Point Cloud Studio'
          }
          onKeyDown={handleFocusTrap}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 lg:p-8 animate-in fade-in duration-150 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`flex flex-col w-full ${activeModal === 'dh' ? 'max-w-6xl xl:max-w-7xl' : 'max-w-4xl lg:max-w-5xl'} h-[88vh] bg-[#fbf9f5] border-2 border-stone-300/90 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150`}>
            {/* Pop-up Window Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-black border border-amber-300 shadow-xs">
                  {activeModal === 'dh' && <Table className="w-5 h-5 text-black" />}
                  {activeModal === 'transform' && <Layers className="w-5 h-5 text-black" />}
                  {activeModal === 'custom' && <Wrench className="w-5 h-5 text-black" />}
                  {activeModal === 'trajectory' && <MoveUpRight className="w-5 h-5 text-black" />}
                  {activeModal === 'analysis' && <LineChart className="w-5 h-5 text-black" />}
                  {activeModal === 'workspace' && <Box className="w-5 h-5 text-black" />}
                </div>
                <div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wider">
                    {activeModal === 'dh' && 'Denavit-Hartenberg (DH) Simulation Studio'}
                    {activeModal === 'transform' && 'Homogeneous Transformation Matrix Studio'}
                    {activeModal === 'custom' && 'Custom Robot Architecture Synthesizer'}
                    {activeModal === 'trajectory' && 'Trajectory Planning & Simulation Studio'}
                    {activeModal === 'analysis' && 'Dynamic Telemetry & Kinematic Plots'}
                    {activeModal === 'workspace' && 'Reachable Workspace Point Cloud Studio'}
                  </h2>
                  <p className="text-xs text-stone-600 font-medium">
                    {activeModal === 'dh' && `Kinematic table, real-time joint simulation, 3D chain visualization, matrices, Jacobian & IK for ${robot.name}`}
                    {activeModal === 'transform' && 'Relative (A_i) and cumulative (T_0i) 4x4 coordinate transformations'}
                    {activeModal === 'custom' && 'Synthesize arbitrary serial kinematic arms with instant 3D compilation'}
                    {activeModal === 'trajectory' && 'Joint-space and Cartesian straight line trajectory interpolation'}
                    {activeModal === 'analysis' && 'Time-series plots of joint positions, velocities, accelerations, and dexterity'}
                    {activeModal === 'workspace' && 'Sample robot workspace via Web Worker and inspect 3D point cloud'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[11px] font-mono text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                  ESC to close
                </span>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-2xl hover:bg-stone-100 text-stone-600 hover:text-black border border-stone-200 transition-colors cursor-pointer"
                  aria-label="Close studio pop-up"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pop-up Window Body (Spacious, Scrollable, Full Width) */}
            <div className="flex-1 overflow-y-auto p-2 bg-[#fbf9f5]">
              {activeModal === 'dh' && <DHTableStudio />}
              {activeModal === 'transform' && <TransformationStudio />}
              {activeModal === 'custom' && <CustomRobotCreator />}
              {activeModal === 'trajectory' && <TrajectoryStudio />}
              {activeModal === 'analysis' && <AnalysisStudio />}
              {activeModal === 'workspace' && <WorkspaceStudio />}
            </div>
          </div>
        </div>
      )}

      {/* 4. Model Setup Wizard Modal (opens on launch or when switching model) */}
      <RobotCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}

export default App;
