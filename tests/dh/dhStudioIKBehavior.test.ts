import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DHTableStudio } from '../../src/features/dh/DHTableStudio';
import { useRobotStore } from '../../src/state/robotStore';

describe('DH Studio Inverse Kinematics Solver Hardening Suite', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetToHome();
    useRobotStore.getState().setTargetPose(null);
  });

  afterEach(() => {
    container.remove();
  });

  it('verifies that unreachable target does not display Best Match Joint Angles or animate buttons', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 80));

    // Switch to Inverse Kinematics tab
    const buttons = Array.from(container.querySelectorAll('button'));
    const ikTabBtn = buttons.find((b) => /inverse\s*kinematics/i.test(b.textContent || ''));
    expect(ikTabBtn).toBeDefined();
    ikTabBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 80));

    // Enter an impossible, unreachable target (X = 50m, Y = 50m, Z = 50m)
    const xInput = container.querySelector<HTMLInputElement>('#dh-ik-target-x');
    const yInput = container.querySelector<HTMLInputElement>('#dh-ik-target-y');
    const zInput = container.querySelector<HTMLInputElement>('#dh-ik-target-z');
    expect(xInput).not.toBeNull();
    expect(yInput).not.toBeNull();
    expect(zInput).not.toBeNull();

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (xInput) {
      nativeSetter?.call(xInput, '50000');
      xInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (yInput) {
      nativeSetter?.call(yInput, '50000');
      yInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (zInput) {
      nativeSetter?.call(zInput, '50000');
      zInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Click Solve IK button
    const solveBtn = container.querySelector<HTMLButtonElement>('#dh-ik-solve-btn');
    expect(solveBtn).not.toBeNull();
    solveBtn?.click();

    // Wait for async solve timeout
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify "Failed to reach" status badge is present
    const statusText = container.textContent || '';
    expect(statusText).toContain('Failed to reach');
    expect(statusText).toContain('beyond kinematic reach');

    // Verify "Best Match Joint Angles" is strictly NOT displayed
    expect(statusText).not.toContain('Best Match Joint Angles:');
    expect(statusText).not.toContain('Selected Branch Joint Angles:');

    // Verify Animate to Simulation button is NOT displayed
    const animateBtn = container.querySelector('#dh-ik-apply-animate-btn');
    expect(animateBtn).toBeNull();

    // Verify Snap button is NOT displayed
    const snapBtn = container.querySelector('#dh-ik-apply-snap-btn');
    expect(snapBtn).toBeNull();

    // Verify candidate branches are NOT displayed
    expect(statusText).not.toContain('All Discovered Branches');

    root.unmount();
  });

  it('verifies that unselecting auto-animate does not snap the robot and displays discovered branches for selection', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Switch to Inverse Kinematics tab
    const buttons = Array.from(container.querySelectorAll('button'));
    const ikTabBtn = buttons.find((b) => /inverse\s*kinematics/i.test(b.textContent || ''));
    ikTabBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Unselect auto-animate checkbox
    const autoAnimateCheckbox = container.querySelector<HTMLInputElement>('#dh-ik-auto-animate');
    expect(autoAnimateCheckbox).not.toBeNull();
    expect(autoAnimateCheckbox?.checked).toBe(true); // default is checked

    autoAnimateCheckbox?.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(autoAnimateCheckbox?.checked).toBe(false);

    // Click Work Pose preset button to place target at a known valid reachable pose
    const workPoseBtn = container.querySelector<HTMLButtonElement>('#dh-ik-preset-work-pose');
    expect(workPoseBtn).not.toBeNull();
    workPoseBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Record robot joint positions BEFORE solve
    const qBeforeSolve = [...useRobotStore.getState().q];

    // Click Solve IK button (button text says "SOLVE INVERSE KINEMATICS" when auto-animate is unchecked)
    const solveBtn = container.querySelector<HTMLButtonElement>('#dh-ik-solve-btn');
    expect(solveBtn?.textContent).toContain('SOLVE INVERSE KINEMATICS');
    solveBtn?.click();

    // Wait for solve to finish
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Crucial check: Robot joints MUST NOT HAVE CHANGED / SNAPPED
    const qAfterSolve = [...useRobotStore.getState().q];
    for (let i = 0; i < qBeforeSolve.length; i++) {
      expect(Math.abs(qAfterSolve[i] - qBeforeSolve[i])).toBeLessThan(1e-6);
    }

    // Status must show Converged
    const statusText = container.textContent || '';
    expect(statusText).toContain('Converged ✓');

    // Right side must display Best Match Joint Angles
    expect(statusText).toContain('Best Match Joint Angles:');

    // Right side must display All Discovered Branches
    expect(statusText).toContain('All Discovered Branches');

    // Verify that Branch cards are rendered and have Animate buttons
    const branchAnimateBtns = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Animate'
    );
    expect(branchAnimateBtns.length).toBeGreaterThanOrEqual(1);

    // Click "Animate" on a branch
    branchAnimateBtns[0]?.click();

    // Verify activeTrajectory was created and trajectory playback is activated
    const storeState = useRobotStore.getState();
    expect(storeState.activeTrajectory).not.toBeNull();
    expect(storeState.playback.isPlaying).toBe(true);

    root.unmount();
  });

  it('verifies clicking a candidate branch selects it, updates displayed joint angles heading, and allows animating that branch', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 80));

    // Switch to Inverse Kinematics tab
    const buttons = Array.from(container.querySelectorAll('button'));
    const ikTabBtn = buttons.find((b) => /inverse\s*kinematics/i.test(b.textContent || ''));
    ikTabBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 80));

    // Unselect auto-animate
    const autoAnimateCheckbox = container.querySelector<HTMLInputElement>('#dh-ik-auto-animate');
    autoAnimateCheckbox?.click();

    // Click Work Pose preset
    const workPoseBtn = container.querySelector<HTMLButtonElement>('#dh-ik-preset-work-pose');
    workPoseBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Solve IK
    const solveBtn = container.querySelector<HTMLButtonElement>('#dh-ik-solve-btn');
    solveBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // If multiple branches exist, select Branch #2 by clicking its card
    const branchCards = Array.from(container.querySelectorAll('div')).filter((d) =>
      d.textContent?.includes('Branch #2') && d.className.includes('cursor-pointer')
    );

    if (branchCards.length > 0) {
      branchCards[0].click();
      await new Promise((resolve) => setTimeout(resolve, 40));

      // Heading should now indicate Selected Branch Joint Angles
      const statusText = container.textContent || '';
      expect(statusText).toContain('Selected Branch Joint Angles:');

      // Click Animate inside Branch #2
      const branch2AnimateBtn = Array.from(branchCards[0].querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Animate'
      );
      branch2AnimateBtn?.click();

      const storeState = useRobotStore.getState();
      expect(storeState.activeTrajectory).not.toBeNull();
      expect(storeState.playback.isPlaying).toBe(true);
    }

    root.unmount();
  });
});
