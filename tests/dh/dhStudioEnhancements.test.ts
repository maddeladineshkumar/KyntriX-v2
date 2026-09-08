import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DHTableStudio } from '../../src/features/dh/DHTableStudio';
import { useRobotStore } from '../../src/state/robotStore';
import { DEG_TO_RAD } from '../../src/robotics/math/constants';

describe('DH Studio Enhancements & Task Validation Suite', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetToHome();
  });

  it('verifies joint addition and deletion buttons are strictly absent from DHTableStudio', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Must NOT contain any Add Joint or Remove Joint buttons
    const buttons = Array.from(container.querySelectorAll('button'));
    const addJointBtn = buttons.find((b) => /add\s*joint/i.test(b.textContent || ''));
    const removeJointBtn = buttons.find((b) => /remove.*joint/i.test(b.textContent || ''));

    expect(addJointBtn).toBeUndefined();
    expect(removeJointBtn).toBeUndefined();

    root.unmount();
    container.remove();
  });

  it('verifies 3D chain simulation tab is strictly removed from navigation and split layout is active', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    const buttons = Array.from(container.querySelectorAll('button'));
    const sim3dBtn = buttons.find((b) => /3d.*simulation/i.test(b.textContent || ''));
    expect(sim3dBtn).toBeUndefined();

    // Verify the split-screen layout: persistent left 3D simulation viewport container is present
    const leftSimContainer = container.querySelector('[data-testid="dh-simulation-viewport-container"]');
    expect(leftSimContainer).not.toBeNull();

    root.unmount();
    container.remove();
  });

  it('verifies Inverse Kinematics subtab has no duplicate 3D target marker gizmo', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Switch to Inverse Kinematics subtab
    const buttons = Array.from(container.querySelectorAll('button'));
    const ikTabBtn = buttons.find((b) => /inverse\s*kinematics/i.test(b.textContent || ''));
    expect(ikTabBtn).toBeDefined();
    ikTabBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Ensure no duplicate target gizmo exists in IK tab
    const gizmo = container.querySelector('[data-testid="target-marker-gizmo"]');
    expect(gizmo).toBeNull();

    // Verify right-side academic IK guide is present
    const allHeaders = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent || '');
    expect(allHeaders.some((text) => /Academic Inverse Kinematics Theory Guide/i.test(text))).toBe(true);

    root.unmount();
    container.remove();
  });

  it('verifies Academic Guide modal opens docked on the right side with all 6 academic sections', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Trigger Academic Guide modal
    const buttons = Array.from(container.querySelectorAll('button'));
    const guideBtn = buttons.find((b) => b.getAttribute('aria-label') === 'Open Academic DH Theory & Guide');
    expect(guideBtn).toBeDefined();
    guideBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // Verify right-side positioning class
    expect(dialog?.className).toContain('justify-end');

    const drawer = dialog?.querySelector('div');
    expect(drawer?.className).toContain('slide-in-from-right');

    // Verify all 6 academic topics exist in the sub-tabs
    const subtabs = Array.from(dialog?.querySelectorAll('button') || []).map((b) => b.textContent || '');
    expect(subtabs.some((t) => /Principles/i.test(t))).toBe(true);
    expect(subtabs.some((t) => /4 Parameters/i.test(t))).toBe(true);
    expect(subtabs.some((t) => /Offset Role/i.test(t))).toBe(true);
    expect(subtabs.some((t) => /Craig vs Standard/i.test(t))).toBe(true);
    expect(subtabs.some((t) => /Frame Assignment/i.test(t))).toBe(true);
    expect(subtabs.some((t) => /Inverse Kinematics/i.test(t))).toBe(true);

    root.unmount();
    container.remove();
  });

  it('verifies DH table provides interactive offset stepper buttons and exact ARIA attributes', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    const store = useRobotStore.getState();
    const dof = store.robot.dof;

    for (let i = 0; i < dof; i++) {
      const offsetInput = container.querySelector<HTMLInputElement>(`input[aria-label="Joint ${i + 1} offset"]`);
      expect(offsetInput).not.toBeNull();

      const minusBtn = container.querySelector<HTMLButtonElement>(`button[aria-label="Joint ${i + 1} offset minus"]`);
      const plusBtn = container.querySelector<HTMLButtonElement>(`button[aria-label="Joint ${i + 1} offset plus"]`);

      expect(minusBtn).not.toBeNull();
      expect(plusBtn).not.toBeNull();
    }

    root.unmount();
    container.remove();
  });

  it('verifies modifying joint offset changes forward kinematics end-effector pose', async () => {
    const store = useRobotStore.getState();
    const originalRobot = store.robot;
    const initialEEPos = store.fkResult.endEffectorTransform.getPosition().clone();

    // Modify joint 2 offset by 90 degrees (+PI/2 rad)
    const modifiedJoints = originalRobot.joints.map((j, idx) =>
      idx === 1 ? { ...j, offset: j.offset + Math.PI / 2 } : j
    );

    store.setRobot({
      ...originalRobot,
      joints: modifiedJoints,
    });

    const updatedEEPos = useRobotStore.getState().fkResult.endEffectorTransform.getPosition();
    expect(updatedEEPos.distanceTo(initialEEPos)).toBeGreaterThan(0.01);
  });

  it('verifies clicking offset stepper safely pauses continuous sweep to avoid animation clashes', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Turn on continuous sweep
    const sweepBtn = Array.from(container.querySelectorAll('button')).find((b) => /Continuous Sweep/i.test(b.textContent || ''));
    expect(sweepBtn).toBeDefined();
    sweepBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Continuous sweep is now active (button says "Pause Sweep")
    const pauseBtn = Array.from(container.querySelectorAll('button')).find((b) => /Pause Sweep/i.test(b.textContent || ''));
    expect(pauseBtn).toBeDefined();

    // Now click the offset plus button on joint 1
    const plusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 1 offset plus"]');
    expect(plusBtn).not.toBeNull();
    plusBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Continuous sweep should now be paused to prevent superposition clash
    const sweepBtnAfter = Array.from(container.querySelectorAll('button')).find((b) => /Continuous Sweep/i.test(b.textContent || ''));
    expect(sweepBtnAfter).toBeDefined();

    root.unmount();
    container.remove();
  });

  it('verifies right-side academic popup can toggle between docked right drawer and full width', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Open guide
    const buttons = Array.from(container.querySelectorAll('button'));
    const guideBtn = buttons.find((b) => b.getAttribute('aria-label') === 'Open Academic DH Theory & Guide');
    guideBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
    const drawer = dialog?.querySelector('div');
    // Initially docked right (max-w-4xl)
    expect(drawer?.className).toContain('max-w-');

    // Click full-screen expand button
    const expandBtn = dialog?.querySelector<HTMLButtonElement>('button[aria-label="Expand full width"]');
    expect(expandBtn).not.toBeNull();
    expandBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Drawer now has max-w-full
    expect(drawer?.className).toContain('max-w-full');

    // Toggle back to dock to right side
    const dockBtn = dialog?.querySelector<HTMLButtonElement>('button[aria-label="Dock to right side"]');
    expect(dockBtn).not.toBeNull();
    dockBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(drawer?.className).toContain('max-w-');

    root.unmount();
    container.remove();
  });

  it('verifies Table subtab academic right panel renders IK Theory without blank content when academicTab is ik', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Open guide and switch to IK tab
    const buttons = Array.from(container.querySelectorAll('button'));
    const guideBtn = buttons.find((b) => b.getAttribute('aria-label') === 'Open Academic DH Theory & Guide');
    guideBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
    const ikBtn = Array.from(dialog?.querySelectorAll('button') || []).find((b) => /Inverse Kinematics/i.test(b.textContent || ''));
    expect(ikBtn).toBeDefined();
    ikBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Close the popup dialog
    const closeBtn = dialog?.querySelector<HTMLButtonElement>('button[aria-label="Close Academic Guide Modal"]');
    closeBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Now in the Table subtab right-side academic panel, academicTab is 'ik'.
    // Verify that the IK theory content is rendered and not blank
    const panelHeaders = Array.from(container.querySelectorAll('h3, span')).map((el) => el.textContent || '');
    expect(panelHeaders.some((text) => /Pieper's Solvability|Pieper's Closed-Form/i.test(text))).toBe(true);

    root.unmount();
    container.remove();
  });

  it('verifies unmount of DHTableStudio cleans up any pending animation frames', async () => {
    let cancelCalled = false;
    const originalCAF = window.cancelAnimationFrame;
    window.cancelAnimationFrame = (id: number) => {
      cancelCalled = true;
      originalCAF(id);
    };

    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Trigger an offset jog to start an animation
    const plusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 1 offset plus"]');
    plusBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Immediately unmount
    root.unmount();
    container.remove();

    expect(cancelCalled).toBe(true);
    window.cancelAnimationFrame = originalCAF;
  });

  it('verifies switching from 6-DOF to 4-DOF robot clamps joint index safely', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Select joint 6 on Puma560
    const j6Btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'J6');
    j6Btn?.click();

    await new Promise((resolve) => setTimeout(resolve, 40));

    // Switch to SCARA (4 DOF)
    await useRobotStore.getState().selectRobot('skeleton_SCARA');

    await new Promise((resolve) => setTimeout(resolve, 80));

    // After switching to 4-DOF SCARA, highest joint button should be J4 and selected joint must not throw or crash
    const jointBtns = Array.from(container.querySelectorAll('button')).filter((b) => /^J\d+$/.test(b.textContent?.trim() || ''));
    expect(jointBtns.length).toBe(4);
    expect(jointBtns.map((b) => b.textContent?.trim())).toEqual(['J1', 'J2', 'J3', 'J4']);

    root.unmount();
    container.remove();
  });

  it('verifies rapid stepper clicks accumulate target values accurately without intermediate drift', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    const initialOffset = useRobotStore.getState().robot.joints[0].offset;

    const plusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 1 offset plus"]');
    expect(plusBtn).not.toBeNull();

    // Click twice rapidly (5 deg + 5 deg = 10 deg)
    plusBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    plusBtn?.click();

    // Allow animation to complete (default duration 600ms)
    await new Promise((resolve) => setTimeout(resolve, 750));

    const finalOffset = useRobotStore.getState().robot.joints[0].offset;
    const expectedOffset = initialOffset + 10 * DEG_TO_RAD;
    expect(Math.abs(finalOffset - expectedOffset)).toBeLessThan(1e-4);

    root.unmount();
    container.remove();
  });

  it('verifies switching animation to another joint cleanly finalizes the active animation on the previous joint', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    const j1PlusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 1 offset plus"]');
    const j2PlusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 2 offset plus"]');
    expect(j1PlusBtn).not.toBeNull();
    expect(j2PlusBtn).not.toBeNull();

    const expectedJ1Target = useRobotStore.getState().robot.joints[0].offset + 5 * DEG_TO_RAD;

    // Start J1 animation
    j1PlusBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // While J1 is mid-animation, start J2 animation
    j2PlusBtn?.click();

    // J1 should have been immediately finalized to its targetVal
    const j1FinalizedOffset = useRobotStore.getState().robot.joints[0].offset;
    expect(Math.abs(j1FinalizedOffset - expectedJ1Target)).toBeLessThan(1e-4);

    // Allow J2 to complete
    await new Promise((resolve) => setTimeout(resolve, 750));

    root.unmount();
    container.remove();
  });

  it('verifies unmounting during an active animation finalizes the target value in the robot store', async () => {
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 60));

    const j1PlusBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Joint 1 offset plus"]');
    const expectedTarget = useRobotStore.getState().robot.joints[0].offset + 5 * DEG_TO_RAD;

    // Start J1 animation
    j1PlusBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Immediately unmount component mid-animation
    root.unmount();
    container.remove();

    // Store must be finalized to expectedTarget, not stranded at an intermediate floating value
    const finalOffset = useRobotStore.getState().robot.joints[0].offset;
    expect(Math.abs(finalOffset - expectedTarget)).toBeLessThan(1e-4);
  });
});

