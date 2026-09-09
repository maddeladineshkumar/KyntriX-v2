import React, { useState, useEffect } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { ROBOTS_CATALOG } from '../../data/robots';
import { Search, Bot, Check, X, Factory, Bone, Wrench, ArrowRight } from 'lucide-react';

interface RobotCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_PRESETS = [
  { id: 'Puma560', label: 'Puma 560 (6R)', color: 'bg-indigo-50 text-black border-indigo-200' },
  { id: 'KukaKR5', label: 'KUKA KR5', color: 'bg-orange-50 text-black border-orange-200' },
  { id: 'ABBIRB120', label: 'ABB IRB 120', color: 'bg-red-50 text-black border-red-200' },
  { id: 'Stanford', label: 'Stanford (5R1P)', color: 'bg-emerald-50 text-black border-emerald-200' },
  { id: 'skeleton_3R', label: 'Planar (3R)', color: 'bg-teal-50 text-black border-teal-200' },
  { id: 'skeleton_SCARA', label: 'SCARA (3R1P)', color: 'bg-amber-50 text-black border-amber-200' },
];

export const RobotCatalogModal: React.FC<RobotCatalogModalProps> = ({ isOpen, onClose }) => {
  const { robot: currentRobot, selectRobot, setActiveTab } = useRobotStore();
  const [search, setSearch] = useState('');
  const [selectedDof, setSelectedDof] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'industrial' | 'skeleton'>('industrial');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Only autofocus search on desktop devices with fine pointer to prevent mobile keyboard pop & zoom
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      timer = setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }, 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  const handleKeyDownTrap = (e: React.KeyboardEvent<HTMLElement>) => {
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

  if (!isOpen) return null;

  const filteredRobots = ROBOTS_CATALOG.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());

    const matchesDof = selectedDof === 'all' || r.dof === selectedDof;

    const isSkeleton = r.id.startsWith('skeleton_');
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'skeleton' && isSkeleton) ||
      (selectedCategory === 'industrial' && !isSkeleton);

    return matchesSearch && matchesDof && matchesCategory;
  });

  const industrialCount = ROBOTS_CATALOG.filter((r) => !r.id.startsWith('skeleton_')).length;
  const skeletonCount = ROBOTS_CATALOG.filter((r) => r.id.startsWith('skeleton_')).length;

  const handleSelect = (id: string) => {
    selectRobot(id);
    onClose();
  };

  const handleOpenCustomBuilder = () => {
    setActiveTab('custom');
    onClose();
  };

  const getManufacturerBadgeColor = (mfg: string) => {
    const m = mfg.toLowerCase();
    if (m.includes('kuka')) return 'bg-orange-100 text-black border-orange-300';
    if (m.includes('abb')) return 'bg-red-100 text-black border-red-300';
    if (m.includes('fanuc')) return 'bg-amber-100 text-black border-amber-300';
    if (m.includes('unimation') || m.includes('puma')) return 'bg-indigo-100 text-black border-indigo-300';
    if (m.includes('epson')) return 'bg-purple-100 text-black border-purple-300';
    if (m.includes('mtab')) return 'bg-cyan-100 text-black border-cyan-300';
    return 'bg-emerald-100 text-black border-emerald-300';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-modal-title"
      onKeyDown={handleKeyDownTrap}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200"
    >
      <div className="catalog-modal-container flex flex-col w-full max-w-5xl h-[96%] h-[96dvh] max-h-[96%] max-h-[96dvh] bg-[#fbf9f5]/95 backdrop-blur-2xl border-2 border-stone-300/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="catalog-header flex items-center justify-between px-3.5 py-2 sm:px-6 sm:py-3 border-b border-stone-200/80 bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-center p-1 shrink-0">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img src="/logo.png" alt="KyntriX Robotics Laboratory Insignia" width="40" height="40" loading="lazy" className="w-full h-full object-contain" />
              </picture>
            </div>
            <div className="min-w-0">
              <h2 id="catalog-modal-title" className="text-xs sm:text-base font-black text-black tracking-tight truncate">
                Robotic Manipulator Configuration Setup
              </h2>
              <p className="catalog-subtitle text-[10px] sm:text-xs text-stone-700 font-medium hidden sm:block truncate">
                Select your industrial CAD robotic arm or theoretical academic skeleton to initialize live simulation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl hover:bg-stone-100 text-stone-600 hover:text-black border border-stone-200 transition-colors cursor-pointer shrink-0"
            aria-label="Close setup modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Input Category Selection & Controls (Ultra-Compact & Fully Responsive across all heights) */}
        <div className="catalog-controls flex flex-col gap-1.5 sm:gap-2.5 p-2 sm:p-3 bg-[#f7f4ed]/90 border-b border-stone-200/80 shrink-0">
          {/* Classification Selector: Compact Segmented Row */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCategory('industrial')}
              aria-pressed={selectedCategory === 'industrial'}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer truncate ${
                selectedCategory === 'industrial'
                  ? 'bg-white border-orange-500 text-orange-950 shadow-xs ring-2 ring-orange-200/60'
                  : 'bg-white/60 border-stone-200 text-stone-700 hover:bg-white hover:border-orange-300'
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="truncate">Industrial ({industrialCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('skeleton')}
              aria-pressed={selectedCategory === 'skeleton'}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer truncate ${
                selectedCategory === 'skeleton'
                  ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-200/60'
                  : 'bg-white/60 border-stone-200 text-stone-700 hover:bg-white hover:border-emerald-300'
              }`}
            >
              <Bone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Skeletons ({skeletonCount})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCustomBuilder}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl border-2 border-dashed border-stone-300 bg-white/60 hover:bg-white hover:border-purple-400 text-xs font-black text-purple-900 transition-all cursor-pointer group truncate"
            >
              <Wrench className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Custom Arm</span>
              <ArrowRight className="w-3 h-3 text-purple-600 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:inline" />
            </button>
          </div>

          {/* Quick Search & DOF Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            {/* Search Box: 16px font-size enforced to eliminate iOS/Android auto-zoom */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-stone-500" />
              <input
                type="text"
                placeholder="Search robot name or brand (Puma, KUKA, ABB, SCARA)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1 sm:py-1.5 bg-white border border-stone-300 rounded-xl text-black font-semibold placeholder:text-stone-500 focus:border-stone-900 focus:ring-2 focus:ring-stone-200 focus:outline-none shadow-xs text-base"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-stone-500 hover:text-black p-0.5"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* DOF Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 shrink-0">
              <span className="text-black font-black text-[11px] sm:text-xs mr-0.5 shrink-0">DOF:</span>
              <button
                type="button"
                onClick={() => setSelectedDof('all')}
                aria-pressed={selectedDof === 'all'}
                className={`px-2 py-0.5 sm:py-1 rounded-lg font-black text-xs transition-all cursor-pointer shrink-0 ${
                  selectedDof === 'all'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-black border border-stone-300 hover:bg-stone-100'
                }`}
              >
                All
              </button>
              {[1, 2, 3, 4, 5, 6].map((dof) => (
                <button
                  type="button"
                  key={dof}
                  onClick={() => setSelectedDof(dof)}
                  aria-pressed={selectedDof === dof}
                  className={`px-1.5 py-0.5 sm:py-1 rounded-lg font-black text-xs transition-all cursor-pointer shrink-0 ${
                    selectedDof === dof
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-white text-black border border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {dof}D
                </button>
              ))}
            </div>
          </div>

          {/* Popular 1-Click Presets */}
          <div className="catalog-presets flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] sm:text-[11px] font-black text-stone-600 mr-0.5 shrink-0">Presets:</span>
            {POPULAR_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                className={`px-2 py-0.5 border text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer hover:shadow-xs shrink-0 whitespace-nowrap ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Robot Cards Grid - Scrollable with min-h-0 so flexbox shrinks properly on short screens */}
        <div className="catalog-grid flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 lg:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 bg-[#f7f4ed]/50 pb-8 sm:pb-10">
          {filteredRobots.map((r) => {
            const isSelected = r.id === currentRobot.id;
            const badgeClass = getManufacturerBadgeColor(r.manufacturer);
            const isSkeleton = r.id.startsWith('skeleton_');

            return (
              <button
                type="button"
                key={r.id}
                onClick={() => handleSelect(r.id)}
                aria-pressed={isSelected}
                aria-label={`Select robot ${r.name}, ${r.dof} degrees of freedom, manufacturer ${r.manufacturer}`}
                className={`catalog-card text-left w-full flex flex-col justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-900 select-none ${
                  isSelected
                    ? 'bg-white border-stone-900 shadow-lg ring-4 ring-amber-400/40'
                    : 'bg-white/95 border-stone-200/90 hover:border-stone-400 hover:shadow-md hover:bg-white'
                }`}
              >
                <div>
                  {/* Card Header with Visual Icon & DOF */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${isSkeleton ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                        {isSkeleton ? <Bone className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-black truncate block">{r.name}</span>
                        <div className="text-[10px] sm:text-[11px] text-stone-600 font-bold truncate">
                          {r.model}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-black rounded-lg bg-stone-900 text-white shadow-xs shrink-0 whitespace-nowrap">
                      {r.dof} DOF
                    </span>
                  </div>

                  {/* Brand and Spec Info */}
                  <div className="space-y-1 mb-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-500 font-medium text-[10px]">Brand:</span>
                      <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${badgeClass}`}>
                        {r.manufacturer}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
                  <span className="text-[10px] text-black font-bold uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-md border border-stone-200 whitespace-nowrap">
                    {r.dhConvention} DH
                  </span>
                  {isSelected ? (
                    <span className="catalog-card-action flex items-center gap-1.5 text-black font-black text-xs bg-emerald-100 border border-emerald-300 px-3 py-1.5 min-h-[44px] rounded-xl shadow-xs whitespace-nowrap">
                      <Check className="w-4 h-4 text-emerald-700" /> Active
                    </span>
                  ) : (
                    <span className="catalog-card-action flex items-center gap-1 text-black font-black text-xs hover:translate-x-0.5 transition-transform bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 min-h-[44px] rounded-xl whitespace-nowrap">
                      Select & Load →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="catalog-footer flex items-center justify-between px-3.5 py-2 sm:px-6 sm:py-2.5 bg-white/95 border-t border-stone-200 text-xs shrink-0">
          <span className="text-stone-700 font-bold text-[11px] sm:text-xs">
            Showing <strong className="text-black font-black">{filteredRobots.length}</strong> of {ROBOTS_CATALOG.length} models
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-6 py-1.5 sm:py-2 min-h-[44px] bg-black hover:bg-stone-800 active:scale-95 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
          >
            Start Live Simulation
          </button>
        </div>
      </div>
    </div>
  );
};


