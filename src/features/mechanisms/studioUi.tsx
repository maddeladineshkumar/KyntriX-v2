import React, { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from './studioUtils';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MODAL_WIDTHS = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  icon,
  size = 'lg',
  onClose,
  children,
  footer,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const inputTarget = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      const firstFocusable = root.querySelector<HTMLElement>(FOCUSABLE);
      (inputTarget ?? firstFocusable ?? root).focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null
      );
      if (!focusable.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/45 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border-2 border-stone-300 bg-[#f7f4ed] shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200',
          MODAL_WIDTHS[size]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-black tracking-tight text-stone-900">
                {title}
              </h2>
              {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-xl p-1.5 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>

        {footer ? (
          <footer className="border-t border-stone-200 bg-white/60 px-4 py-3 sm:px-5">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : document.body
  );
};

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
  accent?: 'amber' | 'blue' | 'emerald' | 'indigo';
  hint?: string;
  className?: string;
}

const ACCENTS = {
  amber: 'accent-amber-600',
  blue: 'accent-blue-600',
  emerald: 'accent-emerald-600',
  indigo: 'accent-indigo-600',
} as const;

export const RangeControl: React.FC<RangeControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled = false,
  accent = 'amber',
  hint,
  className,
}) => {
  const id = useId();
  const formatted = format ? format(value) : String(value);
  return (
    <div className={cx('min-w-0', className)}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label htmlFor={id} className="truncate text-xs font-bold text-stone-700">
          {label}
        </label>
        <span className="shrink-0 font-mono text-xs font-black text-stone-900">{formatted}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={formatted}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cx(
          'w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
          ACCENTS[accent]
        )}
      />
      {hint ? <p className="mt-0.5 text-[10px] leading-snug text-stone-500">{hint}</p> : null}
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  icon,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx(
      'flex w-full items-center justify-between gap-3 rounded-xl border px-2.5 py-2 text-left transition-all',
      checked
        ? 'border-amber-300 bg-amber-50 text-stone-900'
        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
      disabled && 'cursor-not-allowed opacity-45'
    )}
  >
    <span className="flex min-w-0 items-center gap-2">
      {icon ? <span className="shrink-0 text-stone-500">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{label}</span>
        {description ? (
          <span className="block truncate text-[10px] font-medium text-stone-500">{description}</span>
        ) : null}
      </span>
    </span>
    <span
      aria-hidden="true"
      className={cx(
        'relative h-4 w-7 shrink-0 rounded-full transition-colors',
        checked ? 'bg-amber-600' : 'bg-stone-300'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        )}
      />
    </span>
  </button>
);

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
  compact?: boolean;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label}>
      <div
        className={cx(
          'grid gap-1 rounded-xl bg-stone-100 p-1',
          columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
        )}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={cx(
                'rounded-lg px-2 py-1.5 text-[11px] font-black transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600',
                active
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:bg-white/60 hover:text-stone-900',
                compact && 'py-1'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className }) => (
  <span
    className={cx(
      'text-[10px] font-black uppercase tracking-[0.14em] text-stone-500',
      className
    )}
  >
    {children}
  </span>
);

export const Kbd: React.FC<{ children: ReactNode }> = ({ children }) => (
  <kbd className="rounded-md border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700 shadow-2xs">
    {children}
  </kbd>
);
