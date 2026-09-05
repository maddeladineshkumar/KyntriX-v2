export type ContinuousSweepAction = 'toggle-sweep' | 'speed-down' | 'speed-up' | 'ignore';

export interface ShortcutKeyboardEventLike {
  code?: string;
  key?: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
  preventDefault?: () => void;
}

export interface ContinuousSweepShortcutOptions {
  /** Minimum interval in milliseconds between toggle-sweep actions to prevent rapid chatter/jitter (e.g. 150ms) */
  minToggleIntervalMs?: number;
  /** Timestamp of the last toggle action */
  lastToggleTime?: number;
  /** Current timestamp override (defaults to performance.now() if available, else Date.now()) */
  currentTime?: number;
}

function isInteractiveTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toUpperCase() : '';
  if (
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'BUTTON' ||
    Boolean((target as { isContentEditable?: boolean }).isContentEditable)
  ) {
    return true;
  }
  if (typeof target.closest === 'function') {
    if (
      target.closest(
        'button, input, select, textarea, [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"]'
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pure keyboard event processor for Continuous Sweep shortcuts.
 * Robustly guards against:
 * 1. Interactive form & button targets (INPUT, SELECT, TEXTAREA, BUTTON, role="button", isContentEditable)
 * 2. Keyboard auto-repeat (`e.repeat === true`) preventing rapid toggling or speed jitter when keys are held
 * 3. Modifier key combinations (Ctrl, Alt, Meta) to prevent hijacking browser navigation or hotkeys
 * 4. Rapid chatter / debounce interval if minToggleIntervalMs option is provided
 * 5. Spacebar toggles sweep play/pause (supporting code: 'Space', key: ' ', or key: 'Spacebar')
 * 6. `[` slows down sweep speed
 * 7. `]` speeds up sweep speed
 */
export function processContinuousSweepShortcut(
  e: KeyboardEvent | ShortcutKeyboardEventLike,
  options?: ContinuousSweepShortcutOptions
): ContinuousSweepAction {
  const target = e.target as HTMLElement | null;
  if (isInteractiveTarget(target)) {
    return 'ignore';
  }

  // Guard against browser / system modifier combinations (e.g. Ctrl+[ browser back, Cmd+[, Alt+Space)
  if (e.ctrlKey || e.altKey || e.metaKey) {
    return 'ignore';
  }

  // Guard against keyboard auto-repeat so holding down keys does not cause jitter or rapid toggling
  if (e.repeat) {
    return 'ignore';
  }

  const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';

  if (isSpace) {
    // Debounce / throttle check if interval and previous time are provided
    if (
      options &&
      typeof options.minToggleIntervalMs === 'number' &&
      typeof options.lastToggleTime === 'number'
    ) {
      const now =
        options.currentTime ??
        (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - options.lastToggleTime < options.minToggleIntervalMs) {
        return 'ignore';
      }
    }

    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    return 'toggle-sweep';
  } else if (e.key === '[') {
    return 'speed-down';
  } else if (e.key === ']') {
    return 'speed-up';
  }

  return 'ignore';
}
