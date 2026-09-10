import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthModal } from '../../src/features/learning/AuthModal';
import { useLearningStore } from '../../src/features/learning/useLearningStore';
import { PrivacyPolicyView } from '../../src/features/legal/PrivacyPolicyView';
import { TermsOfServiceView } from '../../src/features/legal/TermsOfServiceView';
import { LegalPageView } from '../../src/features/legal/LegalPageView';

describe('Legal Routing and Demo Button Removal Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    useLearningStore.getState().setAuthModalOpen(true);
  });

  afterEach(() => {
    useLearningStore.getState().setAuthModalOpen(false);
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('AuthModal - Demo Configuration Button Removal', () => {
    it('does NOT render demo switch buttons for Admin, Teacher, or Student', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<AuthModal />);
      });

      const text = container.textContent || '';
      // Ensure "Quick Switch Demo Accounts" or direct role configuration buttons are absent
      expect(text).not.toContain('Quick Switch Demo Accounts');
      expect(text).not.toContain('Dr. Elena Rostova');
      expect(text).not.toContain('System Admin');
      expect(text).not.toContain('Marcus Chen');

      // Verify buttons do not contain direct fast-switch demo buttons
      const buttons = Array.from(container.querySelectorAll('button'));
      const buttonLabels = buttons.map(b => b.textContent?.trim());
      expect(buttonLabels.some(l => l?.includes('Student') && l?.includes('Chen'))).toBe(false);
      expect(buttonLabels.some(l => l?.includes('Teacher') && l?.includes('Rostova'))).toBe(false);
      expect(buttonLabels.some(l => l?.includes('Admin') && l?.includes('System'))).toBe(false);

      // Verify privacy policy & terms links are present in AuthModal
      const links = Array.from(container.querySelectorAll('a'));
      const hrefs = links.map(a => a.getAttribute('href'));
      expect(hrefs).toContain('/terms');
      expect(hrefs).toContain('/privacypolicy');

      act(() => {
        root.unmount();
      });
    });
  });

  describe('PrivacyPolicyView Component', () => {
    it('renders full privacy policy with required security and legal sections', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<PrivacyPolicyView />);
      });

      const content = container.textContent || '';
      expect(content).toContain('Privacy Policy');
      expect(content).toContain('Simulation Computing & Client-Side Privacy');
      expect(content).toContain('Security, Authentication & Local Storage');
      expect(content).toContain('Educational Classrooms & Institutional Compliance');
      expect(content).toContain('FERPA / Student Privacy');
      expect(content).toContain('Your Data Rights (GDPR & CCPA)');
      expect(content).toContain('No Data Monetization');
      expect(content).toContain('maddeladineshkumar504@gmail.com');
      expect(content).not.toContain('privacy@kyntrix.edu');
      expect(content).not.toContain('kyntrix.edu / KyntriX-v2');

      act(() => {
        root.unmount();
      });
    });
  });

  describe('TermsOfServiceView Component', () => {
    it('renders comprehensive terms of service with physical robot safety disclaimers', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<TermsOfServiceView />);
      });

      const content = container.textContent || '';
      expect(content).toContain('Terms of Service');
      expect(content).toContain('Physical Machinery & Industrial Safety Disclaimer');
      expect(content).toContain('emergency stop (E-stop)');
      expect(content).toContain('Robot Models, DH Parameters & Intellectual Property');
      expect(content).toContain('User Conduct & Academic Integrity');
      expect(content).toContain('Disclaimer of Warranties & Limitation of Liability');
      expect(content).toContain('Modifications & Governing Law');

      act(() => {
        root.unmount();
      });
    });
  });

  describe('LegalPageView Component & Navigation', () => {
    it('renders Privacy Policy by default when initialTab is privacy', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LegalPageView initialTab="privacy" onBack={() => {}} />);
      });

      expect(container.textContent).toContain('Privacy Policy');
      const privacyTabBtn = container.querySelector('button[role="tab"][aria-selected="true"]');
      expect(privacyTabBtn).not.toBeNull();
      expect(privacyTabBtn?.textContent || '').toContain('Privacy Policy');

      act(() => {
        root.unmount();
      });
    });

    it('renders Terms of Service when initialTab is terms', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LegalPageView initialTab="terms" onBack={() => {}} />);
      });

      expect(container.textContent).toContain('Terms of Service');
      const termsTabBtn = container.querySelector('button[role="tab"][aria-selected="true"]');
      expect(termsTabBtn).not.toBeNull();
      expect(termsTabBtn?.textContent || '').toContain('Terms of Service');

      act(() => {
        root.unmount();
      });
    });

    it('switches between Privacy and Terms tabs when clicked', async () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      const root = createRoot(container);
      await act(async () => {
        root.render(<LegalPageView initialTab="privacy" onBack={() => {}} />);
      });

      // Find the Terms tab button
      const buttons = Array.from(container.querySelectorAll('button[role="tab"]'));
      const termsBtn = buttons.find(b => b.textContent?.includes('Terms of Service'));
      expect(termsBtn).toBeDefined();

      await act(async () => {
        termsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(container.textContent).toContain('Terms of Service');
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/terms');

      // Now switch back to Privacy Policy
      const privacyBtn = buttons.find(b => b.textContent?.includes('Privacy Policy'));
      expect(privacyBtn).toBeDefined();

      await act(async () => {
        privacyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(container.textContent).toContain('Privacy Policy');
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/privacypolicy');

      pushStateSpy.mockRestore();
      act(() => {
        root.unmount();
      });
    });

    it('triggers onBack callback when clicking Back to Simulator', async () => {
      const backSpy = vi.fn();
      const root = createRoot(container);
      await act(async () => {
        root.render(<LegalPageView initialTab="privacy" onBack={backSpy} />);
      });

      const backBtn = container.querySelector('button[title*="Return to 3D"]') as HTMLButtonElement;
      expect(backBtn).not.toBeNull();

      await act(async () => {
        backBtn.click();
      });

      expect(backSpy).toHaveBeenCalledTimes(1);

      act(() => {
        root.unmount();
      });
    });

    it('has an active scrollable viewport container with overflow-y-auto', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<LegalPageView initialTab="privacy" onBack={() => {}} />);
      });

      const scrollContainer = container.firstElementChild as HTMLDivElement;
      expect(scrollContainer).not.toBeNull();
      expect(scrollContainer.className).toContain('overflow-y-auto');
      expect(scrollContainer.className).toContain('fixed');
      expect(scrollContainer.className).toContain('inset-0');
      expect(scrollContainer.className).toContain('touch-pan-y');

      // Verify scroll event triggers scroll-to-top button appearance
      await act(async () => {
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 500, configurable: true });
        scrollContainer.dispatchEvent(new Event('scroll'));
      });

      const topButton = container.querySelector('button[title*="back to top"]');
      expect(topButton).not.toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });

  describe('Route Path Matching Logic', () => {
    function resolveRoute(pathname: string, hash: string): 'privacy' | 'terms' | null {
      const cleanPath = pathname.toLowerCase().replace(/\/+$/, '');
      const cleanHash = hash.toLowerCase();

      if (
        cleanPath === '/privacypolicy' ||
        cleanPath === '/privacy-policy' ||
        cleanPath === '/privacy' ||
        cleanHash === '#/privacypolicy' ||
        cleanHash === '#privacypolicy' ||
        cleanHash === '#/privacy' ||
        cleanHash === '#privacy'
      ) {
        return 'privacy';
      }

      if (
        cleanPath === '/terms' ||
        cleanPath === '/termsofservice' ||
        cleanPath === '/terms-of-service' ||
        cleanHash === '#/terms' ||
        cleanHash === '#terms' ||
        cleanHash === '#/termsofservice' ||
        cleanHash === '#termsofservice'
      ) {
        return 'terms';
      }

      return null;
    }

    it('accurately resolves direct subdomain/path inputs', () => {
      expect(resolveRoute('/privacypolicy', '')).toBe('privacy');
      expect(resolveRoute('/privacypolicy/', '')).toBe('privacy');
      expect(resolveRoute('/privacy', '')).toBe('privacy');
      expect(resolveRoute('/privacy-policy', '')).toBe('privacy');
      expect(resolveRoute('/', '#/privacypolicy')).toBe('privacy');
      expect(resolveRoute('/', '#privacypolicy')).toBe('privacy');

      expect(resolveRoute('/terms', '')).toBe('terms');
      expect(resolveRoute('/terms/', '')).toBe('terms');
      expect(resolveRoute('/termsofservice', '')).toBe('terms');
      expect(resolveRoute('/terms-of-service', '')).toBe('terms');
      expect(resolveRoute('/', '#/terms')).toBe('terms');
      expect(resolveRoute('/', '#terms')).toBe('terms');

      expect(resolveRoute('/', '')).toBeNull();
      expect(resolveRoute('/simulator', '')).toBeNull();
    });
  });
});
