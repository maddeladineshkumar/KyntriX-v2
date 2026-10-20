import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useRobotStore } from './state/robotStore';
import { Viewport3D } from './features/viewport/Viewport3D';
import { JointControlPanel } from './features/control/JointControlPanel';
import { IKStudio } from './features/ik/IKStudio';

// Lazy-load heavy studio modules to optimize initial bundle size (Task 10)
const DHTableStudio = lazy(() =>
  import('./features/dh/DHTableStudio').then((m) => ({ default: m.DHTableStudio }))
);
const TransformationStudio = lazy(() =>
  import('./features/transform/TransformationStudio').then((m) => ({ default: m.TransformationStudio }))
);
const TrajectoryStudio = lazy(() =>
  import('./features/trajectory/TrajectoryStudio').then((m) => ({ default: m.TrajectoryStudio }))
);
const AnalysisStudio = lazy(() =>
  import('./features/analysis/AnalysisStudio').then((m) => ({ default: m.AnalysisStudio }))
);
const CustomRobotCreator = lazy(() =>
  import('./features/custom/CustomRobotCreator').then((m) => ({ default: m.CustomRobotCreator }))
);
const RobotCatalogModal = lazy(() =>
  import('./features/catalog/RobotCatalogModal').then((m) => ({ default: m.RobotCatalogModal }))
);
const WorkspaceStudio = lazy(() =>
  import('./features/workspace/WorkspaceStudio').then((m) => ({ default: m.WorkspaceStudio }))
);
const SmaBfgsStudio = lazy(() =>
  import('./features/smaBfgs/SmaBfgsStudio').then((m) => ({ default: m.SmaBfgsStudio }))
);
const LearningWorkspace = lazy(() =>
  import('./features/learning/LearningWorkspace').then((m) => ({ default: m.LearningWorkspace }))
);
const MechanismsStudio = lazy(() =>
  import('./features/mechanisms/MechanismsStudio').then((m) => ({ default: m.MechanismsStudio }))
);
import { LegalPageView } from './features/legal/LegalPageView';
import { AuthModal } from './features/learning/AuthModal';
import { useLearningStore } from './features/learning/useLearningStore';
import { useSEOMeta } from './features/seo/useSEOMeta';
import { Matrix4 } from './robotics/math/Matrix4';
import { Vector3 } from './robotics/math/Vector3';
import { Euler } from './robotics/math/Euler';

const StudioLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading studio module...' }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex flex-col items-center justify-center h-full min-h-[300px] w-full p-8 gap-3 select-none"
  >
    <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
    <span className="text-xs font-bold text-stone-600">{label}</span>
  </div>
);

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
  HelpCircle,
  BookOpen,
  Dna,
  Orbit,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type StudioModal = 'dh' | 'transform' | 'custom' | 'trajectory' | 'analysis' | 'workspace' | 'sma-bfgs' | null;

const KinematicFeasibilityBadge: React.FC = () => {
  const jacobian = useRobotStore((s) => s.jacobian);
  const isSingular = jacobian.isSingular;
  const manipulability = jacobian.manipulability;

  return (
    <div
      title={
        isSingular
          ? 'Kinematic Singularity: Joint velocities may become unbounded.'
          : `Yoshikawa Manipulability Measure w = √(det(J·Jᵀ)) = ${manipulability.toFixed(4)}. Indicates local dexterity of current joint configuration.`
      }
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 ${
        isSingular
          ? 'bg-amber-100 text-amber-950 border-amber-300'
          : 'bg-emerald-100 text-emerald-950 border-emerald-300'
      }`}
    >
      {isSingular ? (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Singular Pose</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
          <span>Dexterous (w={manipulability.toFixed(3)})</span>
        </>
      )}
    </div>
  );
};

export function App() {
  const robot = useRobotStore((s) => s.robot);
  const activeTab = useRobotStore((s) => s.activeTab);
  const setActiveTab = useRobotStore((s) => s.setActiveTab);
  const activeTrajectory = useRobotStore((s) => s.activeTrajectory);
  const isPlaying = useRobotStore((s) => s.playback.isPlaying);
  const isEStopped = useRobotStore((s) => s.isEStopped);
  const emergencyStop = useRobotStore((s) => s.emergencyStop);
  const resetEStop = useRobotStore((s) => s.resetEStop);
  const resetToHome = useRobotStore((s) => s.resetToHome);
  const storeAnnouncement = useRobotStore((s) => s.statusAnnouncement);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [topTab, setTopTab] = useState<'simulate' | 'trajectory' | 'learning' | 'mechanisms'>('simulate');
  const [activeModal, setActiveModal] = useState<StudioModal>(null);
  const [showJointDrawer, setShowJointDrawer] = useState(false);
  const [showIKDrawer, setShowIKDrawer] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // URL Path & Hash Legal Routing (/privacypolicy, /terms, etc.)
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      path === '/privacypolicy' ||
      path === '/privacy' ||
      path === '/privacy-policy' ||
      hash.includes('privacypolicy') ||
      hash.includes('privacy')
    ) {
      return 'privacy';
    }
    if (
      path === '/terms' ||
      path === '/termsofservice' ||
      path === '/terms-of-service' ||
      hash.includes('terms')
    ) {
      return 'terms';
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (
        path === '/privacypolicy' ||
        path === '/privacy' ||
        path === '/privacy-policy' ||
        hash.includes('privacypolicy') ||
        hash.includes('privacy')
      ) {
        setLegalPage('privacy');
      } else if (
        path === '/terms' ||
        path === '/termsofservice' ||
        path === '/terms-of-service' ||
        hash.includes('terms')
      ) {
        setLegalPage('terms');
      } else {
        setLegalPage(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Global Supabase Auth Initialization & Password Recovery Route Listener
  useEffect(() => {
    useLearningStore.getState().initializeAuth();

    const handleRecoveryRoute = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/reset-password' || hash.includes('type=recovery') || hash.includes('reset-password')) {
        const store = useLearningStore.getState();
        store.setAuthMode('reset-password');
        store.setAuthModalOpen(true);
      }
    };
    handleRecoveryRoute();
    window.addEventListener('popstate', handleRecoveryRoute);
    window.addEventListener('hashchange', handleRecoveryRoute);
    return () => {
      window.removeEventListener('popstate', handleRecoveryRoute);
      window.removeEventListener('hashchange', handleRecoveryRoute);
    };
  }, []);

  // Dynamic SEO metadata & URL parameter sync
  useSEOMeta({
    catalogOpen,
    setCatalogOpen,
    activeModal,
  });

  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const prevDialogOpenRef = useRef(false);

  const isAnyDialogOpen = !!activeModal || showJointDrawer || showIKDrawer || catalogOpen || helpOpen;

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

  // Keyboard shortcuts: H (Home), Space (Play/Pause), ? (Help)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT');
      if (isTyping) return;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        resetToHome();
        setStatusAnnouncement('Robot reset to home configuration.');
      } else if (e.key === ' ' && activeTrajectory) {
        e.preventDefault();
        const store = useRobotStore.getState();
        if (store.isEStopped) return;
        if (store.playback.isPlaying) {
          store.pauseTrajectory();
          setStatusAnnouncement('Trajectory paused.');
        } else {
          store.playTrajectory();
          setStatusAnnouncement('Trajectory playing.');
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [resetToHome, activeTrajectory]);

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

  // Prevent unwanted double-tap zoom on UI elements across mobile touch devices & desktop site mode
  useEffect(() => {
    let lastTouch = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouch <= 300) {
        const target = e.target as HTMLElement | null;
        // Don't suppress double tap on 3D canvas (OrbitControls)
        if (target && !target.closest('canvas')) {
          e.preventDefault();
        }
      }
      lastTouch = now;
    };
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const isAuthenticated = useLearningStore((s) => s.isAuthenticated);
  const user = useLearningStore((s) => s.user);
  const authLoading = useLearningStore((s) => s.authLoading);
  const pendingAuthRedirect = useLearningStore((s) => s.pendingAuthRedirect);
  const setPendingAuthRedirect = useLearningStore((s) => s.setPendingAuthRedirect);
  const isAuthed = isAuthenticated || !!user;

  // Auto-redirect to AI & Learning upon successful authentication if user previously requested it
  useEffect(() => {
    if (isAuthed && pendingAuthRedirect === 'learning') {
      setPendingAuthRedirect(null);
      useLearningStore.getState().setAuthModalOpen(false);
      // oxlint-disable-next-line react/set-state-in-effect
      closeModal();
      setShowJointDrawer(false);
      setShowIKDrawer(false);
      setTopTab('learning');
      setStatusAnnouncement('Welcome to AI & Learning!');
    }
  }, [isAuthed, pendingAuthRedirect, closeModal, setPendingAuthRedirect]);

  // If user requested 'learning' while auth was still loading, and auth finished unauthenticated:
  useEffect(() => {
    if (!authLoading && !isAuthed && pendingAuthRedirect === 'learning' && !useLearningStore.getState().authModalOpen) {
      useLearningStore.getState().setAuthMode('signin');
      useLearningStore.getState().setAuthModalOpen(true);
      // oxlint-disable-next-line react/set-state-in-effect
      setStatusAnnouncement('Please sign in or create an account to access AI & Learning, Problem Arena, and Challenges.');
    }
  }, [authLoading, isAuthed, pendingAuthRedirect]);

  // Protect learning workspace if user logs out while on the learning tab
  useEffect(() => {
    if (topTab === 'learning' && !isAuthed && !authLoading) {
      const timer = setTimeout(() => {
        setTopTab('simulate');
        useLearningStore.getState().setAuthMode('signin');
        useLearningStore.getState().setAuthModalOpen(true);
        setStatusAnnouncement('Signed out. Please sign in to access AI & Learning.');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [topTab, isAuthed, authLoading]);

  const handleSelectTopTab = useCallback(
    (tab: 'simulate' | 'trajectory' | 'learning' | 'mechanisms') => {
      if (tab === 'mechanisms') {
        closeModal();
        setShowJointDrawer(false);
        setShowIKDrawer(false);
        setTopTab('mechanisms');
        setStatusAnnouncement('Switched to Mechanisms & Engines Laboratory.');
        return;
      }

      if (tab === 'learning') {
        const store = useLearningStore.getState();
        const authed = store.isAuthenticated || !!store.user;

        if (authed) {
          closeModal();
          setShowJointDrawer(false);
          setShowIKDrawer(false);
          setTopTab('learning');
          return;
        }

        // If auth verification is still running (e.g. initial session check),
        // record intent so user transitions smoothly once verified or gets prompted if not
        if (store.authLoading) {
          store.setPendingAuthRedirect('learning');
          setStatusAnnouncement('Verifying authentication...');
          return;
        }

        // User is unauthenticated: stay on homepage and prompt directly to login or sign up
        store.setPendingAuthRedirect('learning');
        store.setAuthMode('signin');
        store.setAuthModalOpen(true);
        setStatusAnnouncement('Please sign in or create an account to access AI & Learning, Problem Arena, and Challenges.');
        return;
      }

      setTopTab(tab);
      // When switching top mode, close any open modal from previous mode if not applicable
      if (tab === 'simulate' && (activeModal === 'trajectory' || activeModal === 'analysis')) {
        closeModal();
      } else if (tab === 'trajectory' && activeModal !== 'trajectory' && activeModal !== 'analysis') {
        closeModal();
      }
    },
    [activeModal, closeModal]
  );

  const handleOpenSimulatorFromLearning = useCallback(
    async (robotId?: string, targetPose?: any) => {
      if (robotId && robot.id !== robotId) {
        try {
          await useRobotStore.getState().selectRobot(robotId);
        } catch (err) {
          console.error('Failed to switch robot for challenge:', err);
        }
      }

      if (targetPose) {
        try {
          if (targetPose.position && targetPose.orientationEuler) {
            const euler = new Euler(
              targetPose.orientationEuler[0],
              targetPose.orientationEuler[1],
              targetPose.orientationEuler[2],
              'XYZ'
            );
            const rot3 = euler.toRotationMatrix();
            const targetMat = Matrix4.fromRotationTranslation(
              rot3,
              new Vector3(targetPose.position[0], targetPose.position[1], targetPose.position[2])
            );
            useRobotStore.getState().setTargetPose(targetMat, true);
          }
        } catch (err) {
          console.error('Failed to set target pose from challenge:', err);
        }
        setShowIKDrawer(true);
        setShowJointDrawer(false);
        setActiveTab('ik');
      } else {
        setShowJointDrawer(true);
        setShowIKDrawer(false);
        setActiveTab('fk');
      }

      setTopTab('simulate');
      setStatusAnnouncement('Switched to 3D simulation environment.');
    },
    [robot.id, setActiveTab]
  );

  const handleToggleModal = (modal: StudioModal) => {
    if (activeModal === modal) {
      closeModal();
    } else {
      setActiveModal(modal);
      if (modal && modal !== 'sma-bfgs') {
        setActiveTab(modal);
      }
    }
  };

  if (legalPage) {
    return (
      <LegalPageView
        initialTab={legalPage}
        onBack={() => {
          setLegalPage(null);
          if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname !== '') {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  return (
    <div className="app-root-container flex flex-col w-full h-full h-[100dvh] min-h-full min-h-[100dvh] max-h-full max-h-[100dvh] bg-[#f7f4ed] text-stone-900 overflow-hidden font-sans antialiased">
      {/* Screen reader heading & live region announcements */}
      <h1 className="sr-only">KyntriX Robotics Simulation Laboratory</h1>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {storeAnnouncement || statusAnnouncement || (isEStopped
          ? 'Emergency stop active. All robot motion is halted.'
          : `Active model: ${robot.name}, ${robot.dof} degrees of freedom.`)}
      </div>

      {/* 1. Ultra-Clean Top Bar */}
      <header className="app-top-header relative flex flex-col items-center justify-center px-3 sm:px-6 py-1.5 sm:py-2 bg-[#f7f4ed]/95 backdrop-blur-2xl border-b border-stone-300/80 z-30 shrink-0 shadow-xs">
        {/* Mobile-only brand & actions row (< sm) */}
        <div className="w-full flex items-center justify-between sm:hidden pb-1">
          <picture>
            <source srcSet="/wordmark.webp" type="image/webp" />
            <img
              src="/wordmark.png"
              alt="KyntriX Robotics Laboratory"
              width="120"
              height="24"
              className="h-6 w-auto object-contain cursor-default"
              draggable={false}
            />
          </picture>
          <div className="flex items-center gap-1.5">
            {/* Quick Model Selector Button on mobile header */}
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              aria-label={`Current robot: ${robot.name}. Click to open catalog`}
              title="Click to select or change robot model"
              className="flex items-center gap-1 px-2 py-1 min-h-[36px] bg-amber-50 hover:bg-amber-100 text-stone-900 border border-amber-300 rounded-xl text-[11px] font-black cursor-pointer active:scale-95 shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5 text-black shrink-0" />
              <span className="max-w-[72px] truncate">{robot.name}</span>
              <span className="text-[10px] text-stone-500 font-bold">▾</span>
            </button>
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstallApp}
                aria-label="Install KyntriX application"
                title="Install KyntriX as desktop/mobile app"
                className="flex items-center gap-1 px-2.5 py-1 min-h-[36px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Open robotics theory reference and keyboard shortcuts"
              title="Robotics Reference & Shortcuts (Shortcut: ?)"
              className="flex items-center gap-1 px-2.5 py-1 min-h-[36px] bg-white/90 hover:bg-white text-stone-800 text-[11px] font-black rounded-xl border border-stone-300 shadow-xs transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <HelpCircle className="w-3.5 h-3.5 text-stone-700" />
              <span>Guide</span>
            </button>
          </div>
        </div>

        {/* Permanent KyntriX Wordmark - Top Left on sm+ */}
        <div className="hidden sm:flex absolute left-6 top-2 items-center z-40 pointer-events-auto">
          <picture>
            <source srcSet="/wordmark.webp" type="image/webp" />
            <img
              src="/wordmark.png"
              alt="KyntriX — 3D Robotics Simulation Platform"
              width="180"
              height="40"
              className="h-7 sm:h-9 md:h-10 lg:h-11 w-auto object-contain cursor-default"
              draggable={false}
            />
          </picture>
        </div>

        {/* Right-Side Actions: Install & Help/Guide on sm+ */}
        <div className="hidden sm:flex absolute right-6 top-2 items-center gap-2 z-40">
          {installPrompt && (
            <button
              type="button"
              onClick={handleInstallApp}
              aria-label="Install KyntriX application"
              title="Install KyntriX as desktop/mobile app"
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Open robotics theory reference and keyboard shortcuts"
            title="Robotics Reference & Shortcuts (Shortcut: ?)"
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white/90 hover:bg-white text-stone-800 text-xs font-black rounded-xl border border-stone-300 shadow-xs transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <HelpCircle className="w-3.5 h-3.5 text-stone-700" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>

        {/* Top-Level Mode Selector */}
        <nav
          aria-label="Simulation Mode Selector"
          className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-2xl border-2 border-stone-200/90 bg-white/90 p-1 shadow-md backdrop-blur-xl sm:gap-1.5 sm:p-1.5 lg:gap-2 xl:gap-3"
        >
          {/* Button 1: Simulate Kinematics */}
          <button
            type="button"
            onClick={() => handleSelectTopTab('simulate')}
            aria-label="Simulate Kinematics Mode"
            aria-pressed={topTab === 'simulate'}
            title="Simulate Kinematics"
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-normal transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 sm:gap-1.5 sm:px-2.5 sm:py-2.5 sm:text-[10px] sm:tracking-normal md:px-2 lg:gap-2 lg:px-3 lg:text-[11px] lg:tracking-wide xl:gap-3 xl:px-4 xl:text-xs xl:tracking-wider ${
              topTab === 'simulate'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Sliders className={`w-4 h-4 ${topTab === 'simulate' ? 'text-white' : 'text-stone-700'}`} />
            <span className="inline max-[389px]:hidden sm:hidden lg:inline xl:hidden">Simulate</span>
            <span className="hidden xl:inline">Simulate Kinematics</span>
          </button>

          {/* Button 2: Trajectory Analysis */}
          <button
            type="button"
            onClick={() => handleSelectTopTab('trajectory')}
            aria-label="Trajectory Analysis Mode"
            aria-pressed={topTab === 'trajectory'}
            title="Trajectory Analysis"
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-normal transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 sm:gap-1.5 sm:px-2.5 sm:py-2.5 sm:text-[10px] sm:tracking-normal md:px-2 lg:gap-2 lg:px-3 lg:text-[11px] lg:tracking-wide xl:gap-3 xl:px-4 xl:text-xs xl:tracking-wider ${
              topTab === 'trajectory'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Activity className={`w-4 h-4 ${topTab === 'trajectory' ? 'text-white' : 'text-stone-700'}`} />
            <span className="inline max-[389px]:hidden sm:hidden lg:inline xl:hidden">Trajectory</span>
            <span className="hidden xl:inline">Trajectory Analysis</span>
          </button>

          {/* Button 3: AI & Learning */}
          <button
            type="button"
            onClick={() => handleSelectTopTab('learning')}
            aria-label="AI & Learning Mode"
            aria-pressed={topTab === 'learning'}
            title="AI & Learning"
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-normal transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 sm:gap-1.5 sm:px-2.5 sm:py-2.5 sm:text-[10px] sm:tracking-normal md:px-2 lg:gap-2 lg:px-3 lg:text-[11px] lg:tracking-wide xl:gap-3 xl:px-4 xl:text-xs xl:tracking-wider ${
              topTab === 'learning'
                ? 'bg-gradient-to-r from-stone-800 via-stone-900 to-black text-white shadow-lg shadow-stone-900/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Bot className={`w-4 h-4 ${topTab === 'learning' ? 'text-white' : 'text-stone-700'}`} />
            <span className="inline max-[389px]:hidden sm:hidden lg:inline xl:hidden">Learning</span>
            <span className="hidden xl:inline">AI & Learning</span>
          </button>

          {/* Button 4: Mechanisms & Engines */}
          <button
            type="button"
            onClick={() => handleSelectTopTab('mechanisms')}
            aria-label="Mechanisms & Engines Mode"
            aria-pressed={topTab === 'mechanisms'}
            title="Mechanisms & Engines"
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-normal transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 sm:gap-1.5 sm:px-2.5 sm:py-2.5 sm:text-[10px] sm:tracking-normal md:px-2 lg:gap-2 lg:px-3 lg:text-[11px] lg:tracking-wide xl:gap-3 xl:px-4 xl:text-xs xl:tracking-wider ${
              topTab === 'mechanisms'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                : 'text-stone-700 hover:text-black hover:bg-stone-100/90'
            }`}
          >
            <Orbit className={`w-4 h-4 ${topTab === 'mechanisms' ? 'text-white' : 'text-stone-700'}`} />
            <span className="inline max-[389px]:hidden sm:hidden lg:inline xl:hidden">Engines</span>
            <span className="hidden xl:inline">Mechanisms &amp; Engines</span>
          </button>
        </nav>

        {/* Revealing Feature Toolbar */}
        {topTab !== 'learning' && topTab !== 'mechanisms' && (
          <nav
            aria-label="Feature Studio Tools"
            className="flex items-center gap-2 mt-2 pt-1.5 border-t border-stone-200/70 overflow-x-auto max-w-full pb-0.5"
          >
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

              {/* SMA-BFGS Quasi-Newton IK Solver Pop-up */}
              <button
                onClick={() => handleToggleModal('sma-bfgs')}
                aria-label="SMA-BFGS Quasi-Newton IK Solver"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeModal === 'sma-bfgs'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300 hover:border-stone-400'
                }`}
              >
                <Dna className="w-3.5 h-3.5" />
                <span>SMA-BFGS IK Solver</span>
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
        </nav>
      )}
      </header>

      {/* 2. Main Expansive 3D Simulation Canvas - Semantic Landmark */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-[#f7f4ed]">
        <Viewport3D isPaused={topTab === 'learning' || topTab === 'mechanisms' || !!activeModal} />

        {/* Floating Tactile Joint Jogger Drawer (Responsive across mobile, tablet & desktop) */}
        {topTab !== 'learning' && topTab !== 'mechanisms' && showJointDrawer && (
          <div
            role="dialog"
            aria-label="Joint Actuation Panel"
            onKeyDown={handleFocusTrap}
            style={{ bottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))' }}
            className="absolute top-3 right-3 z-30 w-[calc(100vw-24px)] sm:w-88 lg:w-96 max-w-full bg-white/98 backdrop-blur-2xl border-2 border-stone-300/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-black" />
                <span className="text-xs font-black text-black uppercase tracking-wide">Joint Actuation</span>
                <span className="text-[10px] px-2 py-0.5 bg-stone-200 text-black font-bold rounded-md">
                  {robot.dof} DOF
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowJointDrawer(false);
                    setShowIKDrawer(true);
                    setActiveTab('ik');
                  }}
                  title="Switch to IK Target Solver"
                  className="px-2.5 py-1 min-h-[36px] text-[11px] font-black text-stone-700 hover:text-black hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  IK Solver ➔
                </button>
                <button
                  type="button"
                  onClick={() => setShowJointDrawer(false)}
                  className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-stone-500 hover:text-black hover:bg-stone-200/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  aria-label="Close Joint Actuation Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pb-6">
              <JointControlPanel />
            </div>
          </div>
        )}

        {/* Floating Tactile IK Target Solver Drawer (Responsive right drawer) */}
        {topTab !== 'learning' && topTab !== 'mechanisms' && showIKDrawer && (
          <div
            role="dialog"
            aria-label="Inverse Kinematics Target Solver"
            onKeyDown={handleFocusTrap}
            style={{ bottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))' }}
            className="absolute top-3 right-3 z-30 w-[calc(100vw-24px)] sm:w-96 md:w-[450px] lg:w-[490px] max-w-full bg-white/98 backdrop-blur-2xl border-2 border-stone-300/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
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
                  type="button"
                  onClick={() => {
                    setShowIKDrawer(false);
                    setShowJointDrawer(true);
                    setActiveTab('fk');
                  }}
                  title="Switch to Joint Controls"
                  className="px-2.5 py-1 min-h-[36px] text-[11px] font-black text-stone-700 hover:text-black hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  Joints ➔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowIKDrawer(false);
                    setActiveTab('fk');
                  }}
                  className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-stone-500 hover:text-black hover:bg-stone-200/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  aria-label="Close Inverse Kinematics Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pb-6">
              <IKStudio />
            </div>
          </div>
        )}

        {/* Sleek Floating Glassmorphic Dock in 3D Viewport - Single row horizontal non-wrapping across mobile and desktop */}
        {topTab !== 'learning' && topTab !== 'mechanisms' && (
          <div
            style={{ bottom: 'max(0.625rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))' }}
            className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-nowrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/95 backdrop-blur-2xl border-2 border-stone-300/80 rounded-2xl shadow-xl max-w-[calc(100vw-16px)] overflow-x-auto scrollbar-none"
          >
            {/* Robot Model Selector Pill */}
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              title="Click to change robot model or view catalog"
              aria-label={`Current robot model: ${robot.name} (${robot.dof} DOF). Click to change model.`}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 min-h-[44px] bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-200 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Bot className="w-3.5 h-3.5 text-black shrink-0" />
                <span className="text-xs font-black text-black">{robot.name}</span>
                <span className="text-[10px] text-stone-600 font-bold">({robot.dof} DOF)</span>
              </div>
              <span className="text-[10px] font-black text-black bg-white px-1.5 sm:px-2 py-0.5 rounded border border-stone-300 ml-0.5 sm:ml-1 shrink-0">
                Change ▾
              </span>
            </button>

            {/* Emergency Stop Button */}
            <button
              type="button"
              onClick={isEStopped ? resetEStop : emergencyStop}
              title={isEStopped ? 'Emergency Stop active: Click to Reset/Resume' : 'Emergency Stop: Halt simulation immediately'}
              aria-label={isEStopped ? 'Emergency Stop is active. Click to reset.' : 'Emergency Stop Simulation'}
              aria-pressed={isEStopped}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 min-h-[44px] rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                isEStopped
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/40 animate-pulse ring-2 ring-rose-400'
                  : activeTrajectory && isPlaying
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300'
              }`}
            >
              <Square className={`w-3.5 h-3.5 ${isEStopped || (activeTrajectory && isPlaying) ? 'fill-white' : 'fill-rose-950'}`} />
              <span>{isEStopped ? '■ E-STOP (Reset)' : '■ STOP'}</span>
            </button>

            {/* Singularity / Feasibility Telemetry Badge */}
            <KinematicFeasibilityBadge />

            {/* Reset to Home Button */}
            <button
              type="button"
              onClick={resetToHome}
              title="Reset Robot Pose to Calibrated Home Pose (Shortcut: H)"
              aria-label="Reset to Home Pose"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl font-black text-xs bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 transition-all cursor-pointer shrink-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <RotateCcw className="w-3.5 h-3.5 text-black" />
              <span>Home</span>
            </button>

            {/* Quick Joint Controls Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowJointDrawer((prev) => !prev)}
              title="Toggle Joint Controls Panel"
              aria-label="Toggle Joint Controls Drawer"
              aria-expanded={showJointDrawer}
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                showJointDrawer
                  ? 'bg-black text-white border-black'
                  : 'bg-stone-100 text-black border-stone-300 hover:bg-stone-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI & Learning Integrated Workspace */}
        {topTab === 'learning' && (
          <div className="absolute inset-0 z-20 bg-[#f7f4ed] overflow-y-auto">
            <Suspense fallback={<StudioLoadingFallback label="Loading AI & Learning Environment..." />}>
              <LearningWorkspace onOpenSimulator={handleOpenSimulatorFromLearning} />
            </Suspense>
          </div>
        )}

        {/* Mechanisms & Aerodynamics Laboratory */}
        {topTab === 'mechanisms' && (
          <div className="absolute inset-0 z-20 bg-[#f7f4ed] overflow-hidden">
            <Suspense fallback={<StudioLoadingFallback label="Loading Mechanisms & Engines..." />}>
              <MechanismsStudio />
            </Suspense>
          </div>
        )}
      </main>

      {/* 3. Revealing Application Pop-up Studios (Spacious, Zero-Overflow) */}
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
              : activeModal === 'sma-bfgs'
              ? 'SMA-BFGS Quasi-Newton IK Solver Studio'
              : 'Reachable Workspace Point Cloud Studio'
          }
          onKeyDown={handleFocusTrap}
          className={`fixed inset-0 z-50 flex ${
            activeModal === 'dh'
              ? 'p-0 bg-[#fbf9f5]'
              : 'items-center justify-center bg-black/40 backdrop-blur-md p-2 sm:p-4 lg:p-8'
          } animate-in fade-in duration-150`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`studio-modal-container flex flex-col w-full ${
            activeModal === 'dh'
              ? 'h-full max-h-full rounded-none border-0 shadow-none'
              : activeModal === 'sma-bfgs'
              ? 'max-w-5xl lg:max-w-6xl h-[96%] h-[96dvh] max-h-[96%] max-h-[96dvh] bg-[#fbf9f5] border-2 border-stone-300/90 rounded-2xl sm:rounded-3xl shadow-2xl'
              : 'max-w-4xl lg:max-w-5xl h-[96%] h-[96dvh] max-h-[96%] max-h-[96dvh] bg-[#fbf9f5] border-2 border-stone-300/90 rounded-2xl sm:rounded-3xl shadow-2xl'
          } bg-[#fbf9f5] overflow-hidden animate-in zoom-in-95 duration-150`}>
            {/* Pop-up Window Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-stone-200 bg-white/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-100 text-black border border-amber-300 shadow-xs shrink-0">
                  {activeModal === 'dh' && <Table className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'transform' && <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'custom' && <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'trajectory' && <MoveUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'analysis' && <LineChart className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'workspace' && <Box className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                  {activeModal === 'sma-bfgs' && <Dna className="w-4 h-4 sm:w-5 sm:h-5 text-black" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-black uppercase tracking-wider truncate">
                    {activeModal === 'dh' && 'Denavit-Hartenberg (DH) Simulation Studio'}
                    {activeModal === 'transform' && 'Homogeneous Transformation Matrix Studio'}
                    {activeModal === 'custom' && 'Custom Robot Architecture Synthesizer'}
                    {activeModal === 'trajectory' && 'Trajectory Planning & Simulation Studio'}
                    {activeModal === 'analysis' && 'Dynamic Telemetry & Kinematic Plots'}
                    {activeModal === 'workspace' && 'Reachable Workspace Point Cloud Studio'}
                    {activeModal === 'sma-bfgs' && 'SMA-BFGS Quasi-Newton Inverse Kinematics Studio'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-stone-600 font-medium hidden sm:block truncate">
                    {activeModal === 'dh' && `Live 3D robot simulation & kinematic DH parameters table for ${robot.name}`}
                    {activeModal === 'transform' && 'Relative (A_i) and cumulative (T_0i) 4x4 coordinate transformations'}
                    {activeModal === 'custom' && 'Synthesize arbitrary serial kinematic arms with instant 3D compilation'}
                    {activeModal === 'trajectory' && 'Joint-space and Cartesian straight line trajectory interpolation'}
                    {activeModal === 'analysis' && 'Time-series plots of joint positions, velocities, accelerations, and dexterity'}
                    {activeModal === 'workspace' && 'Sample robot workspace via Web Worker and inspect 3D point cloud'}
                    {activeModal === 'sma-bfgs' && `Reproducible hybrid optimization IK solver with step-by-step trace for ${robot.name}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="hidden sm:inline-block text-[11px] font-mono text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                  ESC to close
                </span>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl hover:bg-stone-100 text-stone-600 hover:text-black border border-stone-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  aria-label="Close studio pop-up"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Pop-up Window Body (Spacious, Scrollable, Full Width with Suspense) */}
            <div className={`flex-1 min-h-0 ${activeModal === 'dh' ? 'overflow-hidden p-0' : 'overflow-y-auto p-2 sm:p-4 bg-[#fbf9f5] pb-16 sm:pb-8'}`}>
              <Suspense fallback={<StudioLoadingFallback label={`Loading ${activeModal} studio...`} />}>
                {activeModal === 'dh' && <DHTableStudio />}
                {activeModal === 'transform' && <TransformationStudio />}
                {activeModal === 'custom' && <CustomRobotCreator />}
                {activeModal === 'trajectory' && <TrajectoryStudio />}
                {activeModal === 'analysis' && <AnalysisStudio />}
                {activeModal === 'workspace' && <WorkspaceStudio />}
                {activeModal === 'sma-bfgs' && <SmaBfgsStudio />}
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* 4. Model Setup Wizard Modal */}
      <Suspense fallback={null}>
        <RobotCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
      </Suspense>

      {/* 5. Help & Robotics Reference Modal */}
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
          onKeyDown={handleFocusTrap}
        >
          <div className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-[#fbf9f5] border-2 border-stone-300 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="help-modal-title" className="text-sm font-black text-black uppercase tracking-wider">
                    Robotics Engineering Reference & Guide
                  </h2>
                  <p className="text-xs text-stone-600">Kinematics concepts & keyboard shortcuts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close reference guide"
                className="p-2 rounded-xl text-stone-500 hover:text-black hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs leading-relaxed text-stone-800">
              <section className="space-y-1.5">
                <h3 className="font-black text-black text-sm">Denavit-Hartenberg (DH) Conventions</h3>
                <p>
                  <strong>Standard DH:</strong> Frame i is attached to link i. Joint axis i aligns with Z<sub>i-1</sub>, common normal a<sub>i</sub> along X<sub>i</sub>, and twist α<sub>i</sub> is about X<sub>i</sub>.
                </p>
                <p>
                  <strong>Craig Modified DH:</strong> Frame i is attached to joint i. Joint axis i aligns with Z<sub>i</sub>, common normal a<sub>i-1</sub> along X<sub>i-1</sub>, and twist α<sub>i-1</sub> is about X<sub>i-1</sub>. Order of operations: Rot<sub>X</sub>(α<sub>i-1</sub>) · Trans<sub>X</sub>(a<sub>i-1</sub>) · Rot<sub>Z</sub>(θ<sub>i</sub>) · Trans<sub>Z</sub>(d<sub>i</sub>).
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-black text-black text-sm">Kinematics & Solvers</h3>
                <p>
                  <strong>Forward Kinematics (FK):</strong> Authoritatively computes the 4×4 homogeneous transformation matrix T<sub>0n</sub> from robot base to tool tip.
                </p>
                <p>
                  <strong>Inverse Kinematics (IK):</strong> Solves for joint angles given a 6D target pose. Analytical 6R solver applies to arms with spherical wrists (Pieper's criterion). Analytical 3R and SCARA solvers solve planar/SCARA chains. Damped Least Squares (DLS) numerical solver handles general architectures and near-singularities.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-black text-black text-sm">Jacobian & Dexterity Metrics</h3>
                <p>
                  <strong>Geometric Jacobian J(q):</strong> Maps joint velocities q̇ to Cartesian end-effector velocities [v<sup>T</sup>, ω<sup>T</sup>]<sup>T</sup>.
                </p>
                <p>
                  <strong>Yoshikawa Manipulability w:</strong> w = √(det(J · J<sup>T</sup>)). Near singular configurations where the arm loses degrees of freedom, w → 0.
                </p>
                <p>
                  <strong>Condition Number κ:</strong> κ = σ<sub>max</sub> / σ<sub>min</sub> ≥ 1. Measures directional velocity isotropy; κ → ∞ at kinematic singularities.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-black text-black text-sm">Degrees of Freedom (DOF) & Workspace</h3>
                <p>
                  <strong>Degrees of Freedom (DOF):</strong> The number of independent joint variables (revolute angles or prismatic offsets) required to completely specify the position and orientation of every link in the manipulator. A 6-DOF arm provides independent control over 3D Cartesian position (X, Y, Z) and orientation (Roll, Pitch, Yaw).
                </p>
                <p>
                  <strong>Reachable Workspace:</strong> The full volume in 3D space that can be reached by the robot's end-effector tip across all allowable joint limit combinations. The dexterous workspace is the subset where arbitrary orientations are also achievable.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-black text-black text-sm">Keyboard Shortcuts</h3>
                <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-stone-200 font-mono text-[11px]">
                  <div><kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">Esc</kbd> Close modal / drawer</div>
                  <div><kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">H</kbd> Reset robot to Home</div>
                  <div><kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">Space</kbd> Play / Pause trajectory</div>
                  <div><kbd className="px-1.5 py-0.5 bg-stone-100 border rounded">?</kbd> Open this guide</div>
                </div>
              </section>

              <section className="space-y-1.5 pt-2 border-t border-stone-200">
                <h3 className="font-black text-black text-sm">Legal & Compliance</h3>
                <p className="text-[11px] text-stone-600">
                  Review our data privacy architecture and industrial robotics terms of use:
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="/privacypolicy"
                    onClick={(e) => {
                      e.preventDefault();
                      setHelpOpen(false);
                      setLegalPage('privacy');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/privacypolicy');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    Privacy Policy (/privacypolicy)
                  </a>
                  <span className="text-stone-300">•</span>
                  <a
                    href="/terms"
                    onClick={(e) => {
                      e.preventDefault();
                      setHelpOpen(false);
                      setLegalPage('terms');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/terms');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    Terms of Service (/terms)
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Global KyntriX Authentication & Password Reset Modal */}
      <AuthModal />
    </div>
  );
}

export default App;
