import React, { useMemo, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { ENGINES } from './engineData';
import type { EngineType } from './types';
import { ModalShell } from './studioUi';
import { cx } from './studioUtils';

interface StudioCatalogProps {
  current: EngineType;
  onSelect: (engine: EngineType) => void;
  onClose: () => void;
}

type Family = (typeof ENGINES)[EngineType]['family'];
type FamilyFilter = Family | 'All';

const FAMILIES: FamilyFilter[] = [
  'All',
  'Aircraft turbines',
  'Piston engines',
  'Rotary engines',
  'Electric drives',
  'Aerospace systems',
];

export const StudioCatalog: React.FC<StudioCatalogProps> = ({ current, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<FamilyFilter>('All');

  const entries = useMemo(() => Object.entries(ENGINES) as [EngineType, (typeof ENGINES)[EngineType]][], []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter(([, meta]) => {
      if (family !== 'All' && meta.family !== family) return false;
      if (!needle) return true;
      return [meta.name, meta.code, meta.subtitle, meta.description, meta.category, meta.family]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, family, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, [EngineType, (typeof ENGINES)[EngineType]][]>();
    for (const entry of filtered) {
      const list = groups.get(entry[1].family) ?? [];
      list.push(entry);
      groups.set(entry[1].family, list);
    }
    return [...groups.entries()];
  }, [filtered]);

  return (
    <ModalShell
      title="Mechanism & Propulsion Collection"
      subtitle="Nine interactive architectures spanning aviation gas turbines, reciprocating engines, rotary power, electric actuation, and a full flight airframe."
      icon={<Sparkles className="h-4 w-4" />}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-stone-500">
          <span>
            Showing {filtered.length} of {entries.length} architectures
          </span>
          <span>Select any card to rebuild the 3D workbench.</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search engines, codes, or descriptions…"
              aria-label="Search engine catalog"
              autoFocus
              className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {FAMILIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFamily(item)}
                aria-pressed={family === item}
                className={cx(
                  'whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors',
                  family === item
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                )}
              >
                {item === 'All' ? 'All' : item.replace(' engines', '').replace('Aircraft turbines', 'Turbines')}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-10 text-center">
            <Search className="h-6 w-6 text-stone-400" />
            <p className="text-sm font-black text-stone-700">No architectures found</p>
            <p className="text-xs text-stone-500">Try a different search term or family filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFamily('All');
              }}
              className="mt-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-black text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          grouped.map(([familyName, list]) => (
            <section key={familyName} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  {familyName}
                </span>
                <span className="h-px flex-1 bg-stone-200" />
                <span className="text-[10px] font-bold text-stone-400">{list.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {list.map(([id, meta]) => {
                  const active = id === current;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelect(id)}
                      aria-pressed={active}
                      className={cx(
                        'group flex flex-col rounded-2xl border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
                        active
                          ? 'border-amber-400 bg-amber-100/90 shadow-xs'
                          : 'border-stone-200/90 bg-white hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-black uppercase tracking-wide text-stone-900">
                            {meta.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-stone-500">
                            {meta.subtitle}
                          </span>
                        </div>
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="rounded-md bg-stone-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700">
                            {meta.code}
                          </span>
                          {active ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : null}
                        </span>
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
                        {meta.description}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {meta.specs.slice(0, 2).map((spec) => (
                          <span
                            key={spec.label}
                            className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-bold text-stone-600"
                          >
                            {spec.label}: {spec.value}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </ModalShell>
  );
};
