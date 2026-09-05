import React, { useState, useEffect } from 'react';
import { useRobotStore } from '../../state/robotStore';
import { ROBOTS_CATALOG } from '../../data/robots';
import { Search, Bot, Check, X, Sparkles, Factory, Bone, Wrench, ArrowRight } from 'lucide-react';

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

    const timer = setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
      }
    }, 40);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
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
      aria-label="Robotic Manipulator Configuration Setup"
      onKeyDown={handleKeyDownTrap}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col w-full max-w-5xl max-h-[90vh] bg-[#fbf9f5]/95 backdrop-blur-2xl border-2 border-stone-300/80 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-100 text-stone-900 rounded-2xl border border-amber-300 shadow-sm">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-black tracking-tight">
                Robotic Manipulator Configuration Setup
              </h2>
              <p className="text-xs text-stone-700 font-medium">
                Select your industrial CAD robotic arm or theoretical academic skeleton to initialize live simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl hover:bg-stone-100 text-stone-600 hover:text-black border border-stone-200 transition-colors cursor-pointer"
            aria-label="Close setup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Category Selection (Big & Colorful) */}
        <div className="flex flex-col gap-4 p-5 bg-[#f7f4ed]/90 border-b border-stone-200/80">
          <div className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Step 1: Choose Manipulator Classification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Industrial Grade Tab */}
            <button
              onClick={() => setSelectedCategory('industrial')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                selectedCategory === 'industrial'
                  ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-200/60'
                  : 'bg-white/60 border-stone-200 hover:bg-white hover:border-orange-300'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700 border border-orange-300 shrink-0">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-black">Industrial Grade (22)</div>
                <div className="text-[11px] text-stone-600 font-medium">
                  CAD STLs: ABB, KUKA, Fanuc, Puma
                </div>
              </div>
            </button>

            {/* Academic Skeletons Tab */}
            <button
              onClick={() => setSelectedCategory('skeleton')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                selectedCategory === 'skeleton'
                  ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-200/60'
                  : 'bg-white/60 border-stone-200 hover:bg-white hover:border-emerald-300'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
                <Bone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-black">Academic Skeletons (20)</div>
                <div className="text-[11px] text-stone-600 font-medium">
                  1R–6R, SCARA, Stanford, SRS, PRP
                </div>
              </div>
            </button>

            {/* Custom Arm Builder Option */}
            <button
              onClick={handleOpenCustomBuilder}
              className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-stone-300 bg-white/60 hover:bg-white hover:border-purple-400 text-left transition-all cursor-pointer group"
            >
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 border border-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-black flex items-center gap-1">
                  <span>Custom Serial Arm</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-[11px] text-stone-600 font-medium">
                  Synthesize arbitrary DH links
                </div>
              </div>
            </button>
          </div>

          {/* Quick Search & DOF Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
              <input
                type="text"
                placeholder="Search robot name or manufacturer (Puma, KUKA, ABB, SCARA)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-stone-300 rounded-xl text-black font-semibold placeholder:text-stone-500 focus:border-stone-900 focus:ring-2 focus:ring-stone-200 focus:outline-none shadow-xs text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-stone-500 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* DOF Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-black font-black text-xs mr-1">DOF:</span>
              <button
                onClick={() => setSelectedDof('all')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  selectedDof === 'all'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white text-black border border-stone-300 hover:bg-stone-100'
                }`}
              >
                All
              </button>
              {[1, 2, 3, 4, 5, 6].map((dof) => (
                <button
                  key={dof}
                  onClick={() => setSelectedDof(dof)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    selectedDof === dof
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white text-black border border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {dof} DOF
                </button>
              ))}
            </div>
          </div>

          {/* Popular 1-Click Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-black text-stone-700 mr-1">Quick Select:</span>
            {POPULAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                className={`px-2.5 py-1 border text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer hover:shadow-sm ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Robot Cards Grid (Big, Colorful, Crisp Black Text) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#f7f4ed]/50">
          {filteredRobots.map((r) => {
            const isSelected = r.id === currentRobot.id;
            const badgeClass = getManufacturerBadgeColor(r.manufacturer);
            const isSkeleton = r.id.startsWith('skeleton_');

            return (
              <div
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className={`flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? 'bg-white border-stone-900 shadow-xl ring-4 ring-amber-400/40'
                    : 'bg-white/90 border-stone-200/90 hover:border-stone-400 hover:shadow-lg hover:bg-white'
                }`}
              >
                <div>
                  {/* Card Header with Visual Icon & DOF */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 ${isSkeleton ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                        {isSkeleton ? <Bone className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-black text-black truncate block">{r.name}</span>
                        <div className="text-[11px] text-stone-600 font-bold truncate">
                          {r.model}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-stone-900 text-white shadow-xs shrink-0 whitespace-nowrap">
                      {r.dof} DOF
                    </span>
                  </div>

                  {/* Brand and Spec Info */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 font-medium text-[11px]">Brand:</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${badgeClass}`}>
                        {r.manufacturer}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
                  <span className="text-[10px] text-black font-bold uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-md border border-stone-200 whitespace-nowrap">
                    {r.dhConvention} DH
                  </span>
                  {isSelected ? (
                    <span className="flex items-center gap-1.5 text-black font-black text-xs bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-xs whitespace-nowrap">
                      <Check className="w-4 h-4 text-emerald-700" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-black font-black text-xs hover:translate-x-0.5 transition-transform bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-xl whitespace-nowrap">
                      Select & Load →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/90 border-t border-stone-200 text-xs">
          <span className="text-stone-700 font-bold">
            Showing <strong className="text-black font-black">{filteredRobots.length}</strong> of {ROBOTS_CATALOG.length} models
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-black hover:bg-stone-800 active:scale-95 text-white font-black rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Start Live Simulation
          </button>
        </div>
      </div>
    </div>
  );
};


