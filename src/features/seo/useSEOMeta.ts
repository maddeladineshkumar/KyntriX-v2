import { useEffect, useRef } from 'react';
import { useRobotStore } from '../../state/robotStore';
import type { StudioTab } from '../../state/robotStore';
import { ROBOTS_CATALOG } from '../../data/robots';

export function useSEOMeta(options?: {
  catalogOpen?: boolean;
  setCatalogOpen?: (open: boolean) => void;
  activeModal?: string | null;
}) {
  const robot = useRobotStore((s) => s.robot);
  const activeTab = useRobotStore((s) => s.activeTab);
  const selectRobot = useRobotStore((s) => s.selectRobot);
  const setActiveTab = useRobotStore((s) => s.setActiveTab);
  const isInitialSyncDone = useRef(false);

  // 1. Initial URL search params parsing on page load
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialSyncDone.current) return;
    isInitialSyncDone.current = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const robotParam = params.get('robot');
      const studioParam = params.get('studio') as StudioTab | null;
      const actionParam = params.get('action');

      if (robotParam) {
        const found = ROBOTS_CATALOG.find(
          (r) =>
            r.id.toLowerCase() === robotParam.toLowerCase() ||
            r.name.toLowerCase() === robotParam.toLowerCase()
        );
        if (found && found.id !== robot.id) {
          selectRobot(found.id);
        }
      }

      if (studioParam) {
        const validStudios: StudioTab[] = ['dh', 'ik', 'transform', 'trajectory', 'analysis', 'workspace', 'custom'];
        if (validStudios.includes(studioParam)) {
          setActiveTab(studioParam);
        }
      }

      if (actionParam === 'catalog' && options?.setCatalogOpen) {
        options.setCatalogOpen(true);
      }
    } catch {
      // Ignore URL parsing errors in non-browser environments
    }
  }, [robot.id, selectRobot, setActiveTab, options]);

  // 2. Dynamic Title, Meta Description, Canonical, and URL synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let pageTitle = 'KyntriX — Online 3D Robotics Simulator & Kinematics Laboratory';
    let metaDescription =
      'Professional web-native 3D robotics simulation platform. Explore 42 industrial and educational robots, compute Standard & Craig DH parameters, solve forward & inverse kinematics, and simulate dynamic trajectories.';
    const currentStudio = options?.activeModal || (activeTab !== 'fk' ? activeTab : null);

    const mfg = robot.manufacturer || 'Industrial';
    const dof = robot.dof || 6;
    const robotName = robot.name || 'Serial Manipulator';

    if (currentStudio === 'dh') {
      pageTitle = `Denavit-Hartenberg (DH) Parameter Studio — ${robotName} | KyntriX`;
      metaDescription = `Interactive Denavit-Hartenberg (DH) parameters table and 3D coordinate frame simulation for the ${robotName} (${dof}-DOF ${mfg} robot). Standard & Craig conventions with real-time updates.`;
    } else if (currentStudio === 'ik') {
      pageTitle = `Inverse Kinematics Solver (6R Analytical & DLS) — ${robotName} | KyntriX`;
      metaDescription = `Multi-strategy Inverse Kinematics solver for ${robotName}. Evaluates closed-form Pieper 6R spherical wrist decoupling and numerical Damped Least Squares (DLS) with null-space optimization.`;
    } else if (currentStudio === 'trajectory') {
      pageTitle = `Trajectory Planning & Simulation — ${robotName} | KyntriX`;
      metaDescription = `Simulate joint-space and Cartesian straight-line trajectories for ${robotName}. Trapezoidal velocity profiles, cubic splines, minimum-jerk quintic polynomials, and continuous scrubbing.`;
    } else if (currentStudio === 'analysis') {
      pageTitle = `Kinematic Telemetry & Telemetry Plots — ${robotName} | KyntriX`;
      metaDescription = `Dynamic time-series plotting for ${robotName}: joint positions, velocities, accelerations, Cartesian end-effector coordinates, and Yoshikawa manipulability index w.`;
    } else if (currentStudio === 'transform') {
      pageTitle = `Homogeneous Transformation Matrix Studio (4x4) — ${robotName} | KyntriX`;
      metaDescription = `Step-by-step SE(3) transformation matrices A_i and cumulative frames T_0i for ${robotName}. Inspect 4x4 matrix decompositions, Euler angles, and unit quaternions.`;
    } else if (currentStudio === 'workspace') {
      pageTitle = `3D Reachable Workspace Point Cloud — ${robotName} | KyntriX`;
      metaDescription = `Synthesize 3D reachable and dexterous workspace point clouds for ${robotName} via off-thread Web Workers. Calculate reach boundaries and dexterous manipulation zones.`;
    } else if (currentStudio === 'custom') {
      pageTitle = 'Custom Robot Architecture Synthesizer | KyntriX';
      metaDescription =
        'Design custom serial robotic manipulators up to 8 DOF. Configure revolute/prismatic joints, limits, and DH parameters with schema validation and JSON export.';
    } else if (options?.catalogOpen) {
      pageTitle = 'Robot Model Catalog (42 Industrial & Educational Arms) | KyntriX';
      metaDescription =
        'Browse 42 calibrated industrial robot models from ABB, KUKA, FANUC, Puma, Stanford, and educational skeleton chains with binary STL geometry.';
    } else {
      pageTitle = `${robotName} (${dof}-DOF ${mfg}) — 3D Robot Kinematics & Simulation | KyntriX`;
      metaDescription = `Interactive 3D simulation and kinematic analysis of the ${robotName} ${dof}-DOF robot manipulator by ${mfg}. Model forward kinematics, joint limits, and Cartesian end-effector pose in real time.`;
    }

    // Apply document title
    document.title = pageTitle;

    // Apply meta description
    const descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descTag) {
      descTag.setAttribute('content', metaDescription);
    }

    // Apply Open Graph title, description, and URL
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', metaDescription);

    const twitterTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);

    const twitterDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', metaDescription);

    // Sync URL search parameters without page reload
    const newParams = new URLSearchParams();
    if (robot.id && robot.id !== 'Puma560') {
      newParams.set('robot', robot.id);
    }
    if (currentStudio && currentStudio !== 'fk') {
      newParams.set('studio', currentStudio);
    }
    if (options?.catalogOpen) {
      newParams.set('action', 'catalog');
    }

    const queryStr = newParams.toString();
    const newRelativeUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
    const fullCanonicalUrl = `https://kyntrix.org${newRelativeUrl}`;

    try {
      window.history.replaceState(null, '', newRelativeUrl);
    } catch {
      // Ignore if replaceState is restricted
    }

    // Update canonical link
    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', fullCanonicalUrl);
    }

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', fullCanonicalUrl);
    }
  }, [robot.id, robot.name, robot.dof, robot.manufacturer, activeTab, options?.activeModal, options?.catalogOpen]);
}
