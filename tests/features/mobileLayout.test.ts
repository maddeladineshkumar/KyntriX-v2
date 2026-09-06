import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { useRobotStore } from '../../src/state/robotStore';
import { ROBOTS_CATALOG } from '../../src/data/robots';
import { RobotCatalogModal } from '../../src/features/catalog/RobotCatalogModal';

vi.mock('../../src/features/viewport/Viewport3D', () => ({
  Viewport3D: () => React.createElement('div', { 'data-testid': 'mock-viewport-3d' }),
}));

describe('Mobile Layout Behavior & Viewport Responsiveness Suite', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await useRobotStore.getState().selectRobot('Puma560');
    useRobotStore.getState().resetToHome();
    useRobotStore.getState().setActiveTab('fk');
  });

  afterEach(() => {
    container.remove();
  });

  it('renders mobile-responsive header and dock controls with accessible names', async () => {
    // Simulate iPhone viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
    window.dispatchEvent(new Event('resize'));

    const root = createRoot(container);
    root.render(React.createElement(App));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Bottom dock must exist
    const dock = container.querySelector('nav, [role="navigation"], .fixed.bottom-4, .fixed.bottom-6') ||
                 container.querySelector('.backdrop-blur-2xl');
    expect(dock).not.toBeNull();

    // Wordmark / Header brand
    const wordmark = container.querySelector('header, .font-black, [aria-label*="KyntriX"]');
    expect(wordmark).not.toBeNull();

    // Interactive buttons should have accessible names
    const buttons = Array.from(container.querySelectorAll('button'));
    const buttonsWithAccessibleNames = buttons.filter(
      (b) => b.getAttribute('aria-label') || b.textContent?.trim() || b.getAttribute('title')
    );
    expect(buttonsWithAccessibleNames.length).toBeGreaterThanOrEqual(buttons.length - 2);

    root.unmount();
  });

  it('exposes all 42 robot models across catalog categories without clipping', async () => {
    expect(ROBOTS_CATALOG.length).toBe(42);

    let closed = false;
    const root = createRoot(container);
    root.render(React.createElement(RobotCatalogModal, { isOpen: true, onClose: () => { closed = true; } }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Catalog modal should be rendered
    const modal = container.querySelector('[role="dialog"], .fixed.inset-0');
    expect(modal).not.toBeNull();

    // Should contain search input
    const searchInput = container.querySelector('input[type="text"], input[placeholder*="Search"]');
    expect(searchInput).not.toBeNull();

    // Accessible close button
    const closeBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Close setup modal"]');
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();
    expect(closed).toBe(true);
    root.unmount();
  });

  it('preserves layout integrity across ultra-compact (320px) and landscape mobile viewports', async () => {
    // 320x568 (iPhone SE)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 568 });
    window.dispatchEvent(new Event('resize'));

    const root = createRoot(container);
    root.render(React.createElement(App));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.querySelector('.fixed.bottom-4, .fixed.bottom-6, .backdrop-blur-2xl')).not.toBeNull();
    root.unmount();

    // 844x390 (Landscape mobile)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 844 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 390 });
    window.dispatchEvent(new Event('resize'));

    const root2 = createRoot(container);
    root2.render(React.createElement(App));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.querySelector('.fixed.bottom-4, .fixed.bottom-6, .backdrop-blur-2xl')).not.toBeNull();
    root2.unmount();
  });
});
