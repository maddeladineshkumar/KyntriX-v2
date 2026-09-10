import React, { useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck, FileCheck, Bot, Printer, ArrowUp } from 'lucide-react';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsOfServiceView } from './TermsOfServiceView';

export interface LegalPageViewProps {
  initialTab?: 'privacy' | 'terms';
  onBack: () => void;
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({
  initialTab = 'privacy',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const handleSelectTab = (tab: 'privacy' | 'terms') => {
    setActiveTab(tab);
    const newPath = tab === 'privacy' ? '/privacypolicy' : '/terms';
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    if (scrollContainerRef.current) {
      if (typeof scrollContainerRef.current.scrollTo === 'function') {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 350);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      if (typeof scrollContainerRef.current.scrollTo === 'function') {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      tabIndex={-1}
      className="fixed inset-0 z-50 w-full h-full h-[100dvh] bg-[#f7f4ed] text-stone-900 font-sans flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y scroll-smooth print:static print:h-auto print:overflow-visible focus:outline-none"
    >
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-stone-300 shadow-xs shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Back to Simulator & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              title="Return to 3D Simulator"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-bold text-stone-800 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Simulator</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stone-300">
              <div className="p-1 rounded-lg bg-black text-white">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-black tracking-tight text-sm text-black">KyntriX</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 font-bold text-stone-700">Legal & Policy</span>
            </div>
          </div>

          {/* Center/Right: Document Tab Selector */}
          <div role="tablist" aria-label="Legal Documents" className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-300 text-xs font-bold">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'privacy'}
              onClick={() => handleSelectTab('privacy')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-white shadow-xs text-amber-900 border border-stone-200'
                  : 'text-stone-600 hover:text-black'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'privacy' ? 'text-amber-600' : 'text-stone-400'}`} />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'terms'}
              onClick={() => handleSelectTab('terms')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-white shadow-xs text-orange-900 border border-stone-200'
                  : 'text-stone-600 hover:text-black'
              }`}
            >
              <FileCheck className={`w-3.5 h-3.5 ${activeTab === 'terms' ? 'text-orange-600' : 'text-stone-400'}`} />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Print Document"
            className="hidden md:flex items-center gap-1.5 p-2 rounded-xl text-stone-500 hover:text-black hover:bg-stone-100 border border-transparent hover:border-stone-300 transition-colors cursor-pointer text-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 md:py-12">
        <div className="bg-white/95 backdrop-blur-xl border-2 border-stone-300/80 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl">
          {activeTab === 'privacy' ? <PrivacyPolicyView /> : <TermsOfServiceView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-300 bg-white/50 text-center text-xs text-stone-500 space-y-1 shrink-0">
        <p className="font-semibold text-stone-700">
          KyntriX Robotics & Deterministic Kinematics Laboratory
        </p>
        <p className="text-[11px] text-stone-400">
          All algorithms, 3D assets, and educational problem sets are strictly governed by our Terms of Service.
        </p>
      </footer>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="Scroll back to top"
          aria-label="Scroll back to top"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer animate-in fade-in duration-200"
        >
          <ArrowUp className="w-4 h-4" />
          <span>Top</span>
        </button>
      )}
    </div>
  );
};
