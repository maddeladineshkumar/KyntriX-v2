// Ensure React 19 act environment is recognized in JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MathExplanationSection, MATH_TOPICS } from '../../src/features/smaBfgs/components/MathExplanationSection';

describe('SMA-BFGS Educational Explanation Panel (Section 19)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('defines exactly 15 explicit mathematical topics required by Section 19 of specification', () => {
    expect(MATH_TOPICS.length).toBe(15);

    const expectedTitles = [
      '1. Inverse Kinematics',
      '2. Forward Kinematics',
      '3. Objective Function',
      '4. Slime Mould Algorithm (SMA)',
      '5. BFGS Optimization',
      '6. Quasi-Newton Concept',
      '7. Gradient Computation',
      '8. Hessian Matrix',
      '9. Inverse-Hessian Approximation',
      '10. Line Search',
      '11. Curvature Condition',
      '12. Joint Limits & Bound Handling',
      '13. Convergence Criteria',
      '14. Numerical Failure Modes',
      '15. Hybrid Optimization Strategy',
    ];

    MATH_TOPICS.forEach((topic, idx) => {
      expect(topic.title).toBe(expectedTitles[idx]);
      expect(topic.subtitle.length).toBeGreaterThan(0);
      expect(topic.category.length).toBeGreaterThan(0);
      expect(topic.mathExpression.length).toBeGreaterThan(0);
      expect(topic.purpose.length).toBeGreaterThan(0);
      expect(topic.kyntrixRelation.length).toBeGreaterThan(0);
      expect(topic.variables.length).toBeGreaterThan(0);
      topic.variables.forEach((v) => {
        expect(v.symbol.length).toBeGreaterThan(0);
        expect(v.dimension.length).toBeGreaterThan(0);
        expect(v.description.length).toBeGreaterThan(0);
      });
    });
  });

  it('renders all 15 topics in the sidebar and switches content when clicked', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<MathExplanationSection />);
    });

    // Check that all 15 sidebar topic buttons exist
    const topicButtons = container.querySelectorAll<HTMLButtonElement>('[data-testid="sidebar-topic-btn"]');
    expect(topicButtons.length).toBe(15);

    // Initial topic should be topic 1: Inverse Kinematics
    expect(container.textContent).toContain('1. Inverse Kinematics');
    expect(container.textContent).toContain('Topic 1 of 15');
    expect(container.textContent).toContain('solveSMABFGSIK');

    // Click through each of the 15 topics in sequence and verify its header and content updates
    for (let i = 0; i < 15; i++) {
      await act(async () => {
        topicButtons[i].click();
      });

      const current = MATH_TOPICS[i];
      expect(container.textContent).toContain(current.title);
      expect(container.textContent).toContain(`Topic ${current.id} of 15`);
      expect(container.textContent).toContain(current.category);
    }
  });

  it('contains valid KaTeX renderings without syntax errors across all 15 topics', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<MathExplanationSection />);
    });

    const topicButtons = container.querySelectorAll<HTMLButtonElement>('[data-testid="sidebar-topic-btn"]');

    // Iterate through all 15 topics and verify that KaTeX renders elements and zero .katex-error elements
    for (let i = 0; i < 15; i++) {
      await act(async () => {
        topicButtons[i].click();
      });

      const katexElements = container.querySelectorAll('.katex');
      expect(katexElements.length).toBeGreaterThan(0);

      const katexErrors = container.querySelectorAll('.katex-error');
      expect(katexErrors.length).toBe(0);
    }
  });

  it('supports sequential Next Topic and Previous Topic navigation controls', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<MathExplanationSection />);
    });

    const prevBtn = container.querySelector<HTMLButtonElement>('[data-testid="prev-topic-btn"]')!;
    const nextBtn = container.querySelector<HTMLButtonElement>('[data-testid="next-topic-btn"]')!;

    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();

    // At Topic 1, Previous is disabled
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);
    expect(container.textContent).toContain('Topic 1 of 15');

    // Click Next -> Topic 2
    await act(async () => {
      nextBtn.click();
    });
    expect(container.textContent).toContain('Topic 2 of 15');
    expect(prevBtn.disabled).toBe(false);

    // Click Next -> Topic 3
    await act(async () => {
      nextBtn.click();
    });
    expect(container.textContent).toContain('Topic 3 of 15');

    // Click Prev -> Topic 2
    await act(async () => {
      prevBtn.click();
    });
    expect(container.textContent).toContain('Topic 2 of 15');
  });

  it('filters topics by search query in the sidebar', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<MathExplanationSection />);
    });

    const searchInput = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(searchInput).toBeTruthy();

    // Search for 'Wolfe'
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      nativeInputValueSetter.call(searchInput, 'Wolfe');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // 'Wolfe' matches both Topic 5 (BFGS alpha_k definition) and Topic 10 (Line Search Strong Wolfe)
    const filteredButtons = container.querySelectorAll<HTMLButtonElement>('[data-testid="sidebar-topic-btn"]');
    expect(filteredButtons.length).toBe(2);
    expect(filteredButtons[0].textContent).toContain('5. BFGS Optimization');
    expect(filteredButtons[1].textContent).toContain('10. Line Search');
  });
});
