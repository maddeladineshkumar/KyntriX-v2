import React from 'react';
import { ArrowLeft, ShieldCheck, FileCheck, Bot, Printer } from 'lucide-react';
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
  const [activeTab, setActiveTab] = React.useState<'privacy' | 'terms'>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = React.useState(initialTab);

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
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-stone-900 font-sans flex flex-col">
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-300 shadow-xs">
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
      <footer className="py-6 border-t border-stone-300 bg-white/50 text-center text-xs text-stone-500 space-y-1">
        <p className="font-semibold text-stone-700">
          KyntriX Robotics & Deterministic Kinematics Laboratory
        </p>
        <p className="text-[11px] text-stone-400">
          All algorithms, 3D assets, and educational problem sets are strictly governed by our Terms of Service.
        </p>
      </footer>
    </div>
  );
};
