import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JointControlPanel } from '../../src/features/control/JointControlPanel';
import { useRobotStore } from '../../src/state/robotStore';
import { RAD_TO_DEG } from '../../src/robotics/math/constants';

describe('JointControlPanel Accessibility & Store Reactivity Suite', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetToHome();
  });

  it('renders range sliders with complete aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext', async () => {
    const root = createRoot(container);
    root.render(React.createElement(JointControlPanel));

    // Wait a microtask for react render
    await new Promise((resolve) => setTimeout(resolve, 50));

    const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]');
    const store = useRobotStore.getState();

    expect(sliders.length).toBe(store.robot.dof);

    sliders.forEach((slider, idx) => {
      const joint = store.robot.joints[idx];
      const isRevolute = joint.type === 'revolute';
      const expectedLabel = isRevolute ? `Joint ${idx + 1} angle` : `Joint ${idx + 1} displacement`;
      const expectedUnit = isRevolute ? 'degrees' : 'mm';

      expect(slider.getAttribute('aria-label')).toBe(expectedLabel);

      const minVal = parseFloat(slider.getAttribute('aria-valuemin') || '0');
      const maxVal = parseFloat(slider.getAttribute('aria-valuemax') || '0');
      const nowVal = parseFloat(slider.getAttribute('aria-valuenow') || '0');
      const valuetext = slider.getAttribute('aria-valuetext') || '';

      const expectedMin = isRevolute ? joint.min * RAD_TO_DEG : joint.min * 1000;
      const expectedMax = isRevolute ? joint.max * RAD_TO_DEG : joint.max * 1000;
      const currentVal = store.q[idx] ?? 0;
      const expectedNow = isRevolute ? currentVal * RAD_TO_DEG : currentVal * 1000;

      expect(minVal).toBeCloseTo(expectedMin, 1);
      expect(maxVal).toBeCloseTo(expectedMax, 1);
      expect(nowVal).toBeCloseTo(expectedNow, 1);
      expect(valuetext).toContain(expectedUnit);
    });

    root.unmount();
    container.remove();
  });

  it('renders numeric inputs with aria-label="Joint N value" for keyboard navigation', async () => {
    const root = createRoot(container);
    root.render(React.createElement(JointControlPanel));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const numInputs = container.querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(numInputs.length).toBe(6);

    numInputs.forEach((input, idx) => {
      expect(input.getAttribute('aria-label')).toBe(`Joint ${idx + 1} value`);
    });

    root.unmount();
    container.remove();
  });

  it('updates slider and input aria-valuenow when store joint variable changes', async () => {
    const root = createRoot(container);
    root.render(React.createElement(JointControlPanel));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Actuate joint 1 to +0.5 rad (~28.65 deg)
    useRobotStore.getState().setJointValue(0, 0.5);

    // Re-render
    root.render(React.createElement(JointControlPanel));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstSlider = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(firstSlider).not.toBeNull();

    const expectedDeg = 0.5 * RAD_TO_DEG;
    const nowVal = parseFloat(firstSlider?.getAttribute('aria-valuenow') || '0');
    expect(nowVal).toBeCloseTo(expectedDeg, 1);
    expect(firstSlider?.getAttribute('aria-valuetext')).toBe(`${expectedDeg.toFixed(1)} degrees`);

    root.unmount();
    container.remove();
  });

  it('displays prismatic joint displacement attributes correctly for Stanford arm', async () => {
    await useRobotStore.getState().selectRobot('Stanford');

    const root = createRoot(container);
    root.render(React.createElement(JointControlPanel));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]');
    // Stanford joint 3 (index 2) is prismatic
    const prismaticSlider = sliders[2];
    expect(prismaticSlider).not.toBeNull();
    expect(prismaticSlider.getAttribute('aria-label')).toBe('Joint 3 displacement');
    expect(prismaticSlider.getAttribute('aria-valuetext')).toContain('mm');

    root.unmount();
    container.remove();
  });

  it('renders aria-label on all DHTableStudio editable cells and type select', async () => {
    const { DHTableStudio } = await import('../../src/features/dh/DHTableStudio');
    const root = createRoot(container);
    root.render(React.createElement(DHTableStudio));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const store = useRobotStore.getState();
    const dof = store.robot.dof;

    for (let i = 0; i < dof; i++) {
      const typeSelect = container.querySelector<HTMLSelectElement>(`select[aria-label="Joint ${i + 1} type"]`);
      expect(typeSelect).not.toBeNull();

      const thetaInput = container.querySelector<HTMLInputElement>(`input[aria-label="Joint ${i + 1} theta"]`);
      expect(thetaInput).not.toBeNull();

      const dInput = container.querySelector<HTMLInputElement>(`input[aria-label="Joint ${i + 1} d"]`);
      expect(dInput).not.toBeNull();

      const aInput = container.querySelector<HTMLInputElement>(`input[aria-label="Joint ${i + 1} a"]`);
      expect(aInput).not.toBeNull();

      const alphaInput = container.querySelector<HTMLInputElement>(`input[aria-label="Joint ${i + 1} alpha"]`);
      expect(alphaInput).not.toBeNull();
    }

    root.unmount();
    container.remove();
  });

  it('numeric input in JointControlPanel steps by 1 degree on ArrowUp keydown', async () => {
    const root = createRoot(container);
    root.render(React.createElement(JointControlPanel));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const initialQ0 = useRobotStore.getState().q[0] ?? 0;
    const firstNumInput = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(firstNumInput).not.toBeNull();

    // Fire ArrowUp keydown event
    firstNumInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedQ0 = useRobotStore.getState().q[0] ?? 0;
    // Difference should be approx 1 degree in radians
    const diffDeg = (updatedQ0 - initialQ0) * RAD_TO_DEG;
    expect(diffDeg).toBeCloseTo(1.0, 1);

    root.unmount();
    container.remove();
  });
});
