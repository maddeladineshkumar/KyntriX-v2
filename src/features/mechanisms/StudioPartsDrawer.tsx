import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Layers,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { EnginePart, EngineType } from './types';
import { getPartGroups } from './studioConfig';
import { cx } from './studioUtils';

interface StudioPartsDrawerProps {
  engine: EngineType;
  parts: EnginePart[];
  selected: string | null;
  selectedParts: string[];
  hidden: string[];
  isolated: string | null;
  onSelect: (part: EnginePart) => void;
  onToggleVisibility: (partId: string) => void;
  onIsolate: (partId: string) => void;
  onResetVisibility: () => void;
  onClose: () => void;
}

const StudioPartsDrawerComponent: React.FC<StudioPartsDrawerProps> = ({
  engine,
  parts,
  selected,
  selectedParts,
  hidden,
  isolated,
  onSelect,
  onToggleVisibility,
  onIsolate,
  onResetVisibility,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return parts;
    return parts.filter((part) =>
      [part.name, part.short, part.role, part.material, part.description]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [parts, query]);

  const groups = useMemo(() => getPartGroups(engine, filtered), [engine, filtered]);
  const hasHiddenOrIsolated = hidden.length > 0 || isolated !== null;

  return (
    <div className="flex h-full w-72 max-w-[88vw] flex-col bg-white/95 backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-stone-200 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <span className="block truncate text-xs font-black uppercase tracking-wider text-stone-800">
              Assembly Breakdown
            </span>
            <span className="block text-[10px] font-semibold text-stone-500">
              {parts.length} components · {groups.length} subsystems
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close component drawer"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-stone-200 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components…"
            aria-label="Search components"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-8 text-xs font-semibold text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear component search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:text-stone-800"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-8 text-center">
            <Search className="h-5 w-5 text-stone-400" />
            <p className="text-xs font-bold text-stone-600">No components match “{query}”.</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[11px] font-black text-amber-700 underline-offset-2 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          groups.map((group) => {
            const isCollapsed = !query && collapsed[group.label];
            return (
              <section key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((previous) => ({
                      ...previous,
                      [group.label]: !previous[group.label],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 shrink-0 text-stone-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0 text-stone-400" />
                    )}
                    <span className="truncate text-[10px] font-black uppercase tracking-wider text-stone-500">
                      {group.label}
                    </span>
                  </span>
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
                    {group.parts.length}
                  </span>
                </button>

                {!isCollapsed ? (
                  <div className="space-y-1">
                    {group.parts.map((part) => {
                      const isSelected = selectedParts.length
                        ? selectedParts.includes(part.id)
                        : selected === part.id;
                      const isHidden = hidden.includes(part.id);
                      const isIsolated = isolated === part.id;

                      return (
                        <div
                          key={part.id}
                          className={cx(
                            'flex items-center justify-between gap-1 rounded-xl border px-2 py-1.5 text-xs font-bold transition-all',
                            isSelected
                              ? 'border-amber-300 bg-amber-100/80 text-stone-950 shadow-xs'
                              : isHidden
                                ? 'border-transparent bg-stone-100/60 text-stone-400 opacity-60'
                                : 'border-stone-200/60 bg-white text-stone-800 hover:bg-stone-50'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(part)}
                            aria-pressed={isSelected}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                          >
                            <span className="shrink-0 font-mono text-[10px] font-bold text-stone-500">
                              {part.number}
                            </span>
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
                              style={{ backgroundColor: part.color }}
                            />
                            <span className="truncate">{part.name}</span>
                          </button>

                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onIsolate(part.id)}
                              aria-label={
                                isIsolated
                                  ? `Show all components instead of ${part.name}`
                                  : `Isolate ${part.name}`
                              }
                              title={isIsolated ? 'Show entire assembly' : 'Isolate component'}
                              className={cx(
                                'rounded-md p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600',
                                isIsolated
                                  ? 'bg-amber-500 text-white'
                                  : 'text-stone-500 hover:bg-stone-200 hover:text-stone-800'
                              )}
                            >
                              <Focus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleVisibility(part.id)}
                              aria-label={
                                isHidden ? `Show ${part.name}` : `Hide ${part.name}`
                              }
                              title={isHidden ? 'Show component' : 'Hide component'}
                              className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600"
                            >
                              {isHidden ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>

      {hasHiddenOrIsolated ? (
        <div className="border-t border-stone-200 bg-stone-50 p-2">
          <button
            type="button"
            onClick={onResetVisibility}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white py-1.5 text-xs font-bold text-stone-800 shadow-2xs transition-colors hover:bg-stone-100"
          >
            <RotateCcw className="h-3 w-3 text-stone-600" />
            <span>Reset Part Visibility</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const StudioPartsDrawer = React.memo(StudioPartsDrawerComponent);
